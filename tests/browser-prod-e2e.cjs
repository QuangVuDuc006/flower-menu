const { chromium } = require(process.env.FLOWER_QA_NODE_MODULES || require('path').join(process.env.TEMP, 'flower-qa/node_modules/playwright'));
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');

(async () => {
  // Ensure dist is built
  if (!fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
    console.log('Building production bundle first...');
    const { execSync } = require('node:child_process');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // Load worker and jose via dynamic import
  const worker = (await import('../worker/index.js')).default;
  const { generateKeyPair, exportJWK, SignJWT } = await import('jose');

  // Setup RS256 keys for simulated Cloudflare Access JWT
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'prod-test-key', alg: 'RS256' };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (typeof url === 'string' && url.includes('/cdn-cgi/access/certs')) {
      return Response.json({ keys: [jwk] });
    }
    return originalFetch(url, opts);
  };

  const ACCESS_TEAM = 'flower-prod-test';
  const ACCESS_AUD = 'prod-admin-aud';
  const ADMIN_EMAIL = 'owner@example.invalid';

  async function createAdminToken() {
    return new SignJWT({ email: ADMIN_EMAIL })
      .setProtectedHeader({ alg: 'RS256', kid: 'prod-test-key' })
      .setIssuer(`https://${ACCESS_TEAM}.cloudflareaccess.com`)
      .setAudience(ACCESS_AUD)
      .setExpirationTime('1h')
      .sign(privateKey);
  }

  const adminToken = await createAdminToken();

  // Initialize in-memory SQLite database
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../migrations/0001_products.sql'), 'utf8'));
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../migrations/0002_product_images.sql'), 'utf8'));
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../migrations/0003_production_readiness.sql'), 'utf8'));

  // Seed initial products from seeds/catalog-preview.sql
  sqlite.exec(fs.readFileSync(path.join(__dirname, '../seeds/catalog-preview.sql'), 'utf8'));

  // Mark LAN-001 as featured for featured testing
  sqlite.exec("UPDATE products SET isFeatured = 1, sortOrder = 1 WHERE id = 'lan-001'");

  // Insert base shop settings
  sqlite.exec(`INSERT OR REPLACE INTO site_settings (key, value, updatedAt) VALUES
    ('shopName', 'Tiệm Hoa Tươi Production', '2026-11-25T00:00:00.000Z'),
    ('tagline', 'Hoa đẹp mỗi ngày tại quầy', '2026-11-25T00:00:00.000Z'),
    ('hours', '08:00 – 21:00 hàng ngày', '2026-11-25T00:00:00.000Z'),
    ('address', '123 Đường Hoa, Phường Bến Nghé, Quận 1', '2026-11-25T00:00:00.000Z'),
    ('contactNote', 'Liên hệ Zalo để được hỗ trợ tư vấn nhanh nhất.', '2026-11-25T00:00:00.000Z')`);

  const env = {
    ACCESS_TEAM,
    ACCESS_ADMIN_AUD: ACCESS_AUD,
    ADMIN_EMAIL,
    SHOP_NAME: 'Tiệm Hoa Tươi Production',
    SHOP_TAGLINE: 'Hoa đẹp mỗi ngày tại quầy',
    DB: {
      prepare(sql) {
        const stmt = sqlite.prepare(sql);
        const wrap = (boundArgs = []) => ({
          async all() {
            return { results: stmt.all(...boundArgs) };
          },
          async first() {
            return stmt.get(...boundArgs) ?? null;
          },
          async run() {
            return stmt.run(...boundArgs);
          },
          bind(...values) {
            return wrap(values);
          },
        });
        return wrap();
      },
    },
  };

  let simulate500 = false;
  let serverPort = 0;

  // Static MIME types
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8',
  };

  const distDir = path.join(__dirname, '../dist');

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://127.0.0.1:${serverPort}`);
      const pathname = parsedUrl.pathname;

      // Handle simulated 500 error
      if (simulate500 && pathname.startsWith('/api/')) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Lỗi máy chủ mô phỏng.' }));
        return;
      }

      // Route /api/* directly to worker.fetch
      if (pathname.startsWith('/api/')) {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const reqBody = (req.method === 'GET' || req.method === 'HEAD') ? undefined : Buffer.concat(chunks);

        const webHeaders = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (Array.isArray(v)) {
            for (const val of v) webHeaders.append(k, val);
          } else if (v !== undefined) {
            webHeaders.set(k, v);
          }
        }

        // Inject Cloudflare Access JWT Assertion for admin endpoints
        if (pathname.startsWith('/api/admin/')) {
          webHeaders.set('Cf-Access-Jwt-Assertion', adminToken);
        }

        // Ensure Origin header matches url
        webHeaders.set('Origin', `http://127.0.0.1:${serverPort}`);

        const webReq = new Request(`http://127.0.0.1:${serverPort}${req.url}`, {
          method: req.method,
          headers: webHeaders,
          body: reqBody,
        });

        const workerRes = await worker.fetch(webReq, env);
        const resHeaders = Object.fromEntries(workerRes.headers.entries());
        res.writeHead(workerRes.status, resHeaders);
        const resBuffer = Buffer.from(await workerRes.arrayBuffer());
        res.end(resBuffer);
        return;
      }

      // Static files from dist
      let filePath = path.join(distDir, decodeURIComponent(pathname));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // SPA Fallback: serve dist/index.html
      const indexPath = path.join(distDir, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } catch (err) {
      console.error('Server internal error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      serverPort = server.address().port;
      resolve();
    });
  });

  const baseUrl = `http://127.0.0.1:${serverPort}`;
  console.log(`Production Test Server listening on ${baseUrl}`);

  fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // -------------------------------------------------------------------------
    // 1. ALL 6 Viewports on 5 Screens: [320, 375, 390, 768, 1024, 1440]
    // Assert scrollWidth <= innerWidth, zero broken images
    // -------------------------------------------------------------------------
    console.log('--- Testing 6 Viewports on Catalog, Detail, Admin, Categories, Settings ---');
    const viewports = [320, 375, 390, 768, 1024, 1440];

    // Screen 1: Public Catalog
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseUrl);
      await page.locator('h1').waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Catalog horizontal overflow at ${width}px`);
      // Zero broken images
      const brokenImages = await page.evaluate(() =>
        Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).length
      );
      assert.equal(brokenImages, 0, `Found broken images on Catalog at ${width}px`);

      if (width === 320) await page.screenshot({ path: 'tests/screenshots/prod-catalog-320.png', fullPage: true });
      if (width === 390) await page.screenshot({ path: 'tests/screenshots/prod-catalog-390.png', fullPage: true });
      if (width === 1440) await page.screenshot({ path: 'tests/screenshots/prod-catalog-1440.png', fullPage: true });
    }

    // Screen 2: Product Detail (/flowers/LAN-001)
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}/flowers/LAN-001`);
      await page.locator('h1').waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Detail overflow at ${width}px`);
      const brokenImages = await page.evaluate(() =>
        Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).length
      );
      assert.equal(brokenImages, 0, `Found broken images on Detail at ${width}px`);
      if (width === 390) await page.screenshot({ path: 'tests/screenshots/prod-detail-390.png', fullPage: true });
    }

    // Screen 3: Admin Products (/admin)
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}/admin`);
      await page.getByRole('heading', { name: 'Danh sách mẫu hoa' }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Admin Products overflow at ${width}px`);
      if (width === 390) await page.screenshot({ path: 'tests/screenshots/prod-admin-390.png', fullPage: true });
    }

    // Screen 4: Admin Categories (/admin/categories)
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}/admin/categories`);
      await page.getByRole('heading', { name: 'Quản lý danh mục', exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Admin Categories overflow at ${width}px`);
      if (width === 390) await page.screenshot({ path: 'tests/screenshots/prod-categories-390.png', fullPage: true });
    }

    // Screen 5: Admin Settings (/admin/settings)
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${baseUrl}/admin/settings`);
      await page.getByRole('heading', { name: 'Cài đặt tiệm hoa' }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Admin Settings overflow at ${width}px`);
      if (width === 390) await page.screenshot({ path: 'tests/screenshots/prod-settings-390.png', fullPage: true });
    }

    // -------------------------------------------------------------------------
    // 2. Customer Flows
    // -------------------------------------------------------------------------
    console.log('--- Testing Customer Flows (Search, Categories, Code Search, Copy, Share, Strict No DEMO) ---');
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(baseUrl);
    await page.locator('h1').waitFor();

    // Verify ZERO "DEMO" or "Dữ liệu DEMO" text on production page
    const demoCount = await page.getByText(/DEMO|Dữ liệu DEMO/i).count();
    assert.equal(demoCount, 0, 'Production catalog must not contain any DEMO text');

    // Accent-insensitive Vietnamese search
    const searchInput = page.getByPlaceholder('Tìm tên hoa hoặc mã mẫu...');
    await searchInput.fill('hong phan');
    assert(await page.getByText('Lan Hồng Phấn').isVisible());
    assert.equal(await page.getByText('Lan Trắng Ánh Kim').count(), 0);

    // Product code search (case & hyphen insensitive)
    await searchInput.fill('lan-003');
    assert(await page.getByText('LAN-003').isVisible());
    await searchInput.fill('LAN004');
    assert(await page.getByText('LAN-004').isVisible());
    await searchInput.fill('');

    // Dynamic category filtering
    await page.getByRole('button', { name: /^Hoa theo yêu cầu/ }).click();
    assert(await page.getByText('Lan Hồng Phấn').isVisible());
    await page.getByRole('button', { name: /^Tất cả/ }).click();

    // Featured item display check
    const featuredBadge = page.locator('article span', { hasText: 'Nổi bật' }).first();
    assert(await featuredBadge.isVisible(), 'Featured product must display "Nổi bật" badge');

    // Direct Product Detail & Copy code
    await page.locator('button[data-product-code="LAN-001"]').click();
    await page.locator('h1').waitFor();
    await page.getByRole('button', { name: /Sao chép mã/ }).click();
    await page.getByText('Đã sao chép mã mẫu LAN-001', { exact: true }).waitFor();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(clipboardText, 'LAN-001');

    // Share link clipboard fallback
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    });
    await page.getByRole('button', { name: /Chia sẻ/ }).click();
    await page.getByRole('button', { name: 'Đã sao chép liên kết' }).waitFor();
    const shareClipboard = await page.evaluate(() => navigator.clipboard.readText());
    assert(shareClipboard.includes('/flowers/LAN-001'), 'Clipboard must contain product URL');

    // Verify /design-system is disabled in production
    await page.goto(`${baseUrl}/design-system`);
    await page.locator('h1').waitFor();
    assert.equal(await page.getByText('Hệ thống thiết kế').count(), 0, '/design-system must not display in prod');

    // -------------------------------------------------------------------------
    // 3. Accessibility Flows (A5 Focus Management)
    // -------------------------------------------------------------------------
    console.log('--- Testing Accessibility (A5 Keyboard navigation, Focus restoration, Modal focus trap) ---');
    await page.goto(baseUrl);
    await page.locator('h1').waitFor();

    // Keyboard Enter on focused product card
    const cardOpener = page.locator('button[data-product-code="LAN-002"]');
    await cardOpener.focus();
    await page.keyboard.press('Enter');
    await page.locator('h1').waitFor();
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    assert.equal(activeTag, 'H1', 'Entering product detail must move focus to h1');

    // Pressing Back button restores focus to originating card
    await page.getByRole('button', { name: 'Quay lại danh mục' }).click();
    await page.locator('h1').waitFor();
    const restoredCode = await page.evaluate(() => document.activeElement?.getAttribute('data-product-code'));
    assert.equal(restoredCode, 'LAN-002', 'Returning to catalog must restore focus to originating card');

    // Modal focus trap & Escape handling in DialogModal
    await page.goto(`${baseUrl}/admin`);
    await page.getByRole('heading', { name: 'Danh sách mẫu hoa' }).waitFor();
    const hideBtn = page.getByRole('button', { name: /^Ẩn/ }).first();
    await hideBtn.focus();
    await hideBtn.click();

    // Modal is open
    const modalTitle = page.getByRole('heading', { name: 'Ẩn mẫu hoa này?' });
    await modalTitle.waitFor();
    // Check focus inside modal
    await page.waitForFunction(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    const isInsideDialog = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    assert(isInsideDialog, 'Focus must move inside confirmation modal');

    // Press Escape to close modal and verify focus restores to opener
    await page.keyboard.press('Escape');
    await modalTitle.waitFor({ state: 'detached' });
    const isOpenerFocused = await page.evaluate((el) => document.activeElement === el, await hideBtn.elementHandle());
    assert(isOpenerFocused, 'Closing modal with Escape must restore focus to opener button');

    // -------------------------------------------------------------------------
    // 4. Live Admin Flows
    // -------------------------------------------------------------------------
    console.log('--- Testing Live Admin Flows (Category, WebP Upload, Optimistic Locking 409, Unsaved changes) ---');
    // Create new category
    await page.goto(`${baseUrl}/admin/categories`);
    await page.getByLabel('Tên danh mục', { exact: true }).fill('Hoa Cưới Cao Cấp');
    await page.getByRole('button', { name: 'Thêm danh mục' }).click();
    await page.getByText('Đã thêm danh mục "Hoa Cưới Cao Cấp".').waitFor();

    // Create product with real image upload
    await page.goto(`${baseUrl}/admin`);
    await page.getByRole('button', { name: 'Thêm mẫu hoa' }).click();
    await page.getByLabel('Tên mẫu hoa *').fill('Bình Lan Cưới Bạch Ngọc');
    await page.getByLabel('Giá bán (VNĐ) *').fill('1750000');
    await page.locator('#primary-cat-select').selectOption('Hoa Cưới Cao Cấp');

    // File upload
    const uploadInput = page.locator('input[type=file]');
    await uploadInput.setInputFiles('public/flowers/placeholder.png');
    await page.locator('img[src^="data:image"]').first().waitFor();

    await page.getByRole('button', { name: 'Thêm mẫu hoa', exact: true }).click();
    await page.getByRole('heading', { name: 'Danh sách mẫu hoa' }).waitFor();
    assert(await page.getByRole('heading', { name: 'Bình Lan Cưới Bạch Ngọc' }).isVisible(), 'Newly created product must appear in list');

    // Edit product and preserve secondary categories
    await page.getByRole('button', { name: /^Chỉnh sửa/ }).first().click();
    await page.getByRole('button', { name: 'Hoa bó', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await page.getByRole('heading', { name: 'Danh sách mẫu hoa' }).waitFor();

    // Unsaved changes confirmation modal
    await page.getByRole('button', { name: /^Chỉnh sửa/ }).first().click();
    await page.getByLabel('Tên mẫu hoa *').fill('Tên sửa tạm chưa lưu');
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    const unsavedModalTitle = page.getByRole('heading', { name: 'Hủy thay đổi chưa lưu?' });
    await unsavedModalTitle.waitFor();
    await page.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }).click();
    await unsavedModalTitle.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.getByRole('button', { name: 'Hủy thay đổi' }).click();
    await page.getByRole('heading', { name: 'Danh sách mẫu hoa' }).waitFor();

    // Optimistic locking 409 Conflict Recovery
    await page.getByRole('button', { name: /^Chỉnh sửa/ }).first().click();
    // Directly mutate version in DB behind the scenes
    sqlite.exec("UPDATE products SET version = version + 1, name = 'Bình Lan Đột Biến' WHERE name LIKE 'Bình Lan%'");
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();

    // Verify 409 conflict UI
    await page.getByRole('heading', { name: 'Xung đột dữ liệu' }).waitFor();
    assert(await page.getByText('Mẫu hoa vừa được cập nhật ở thiết bị hoặc tab khác').isVisible());
    // Click reload latest button
    await page.getByRole('button', { name: 'Tải lại bản mới nhất' }).click();
    // Value in input updates to latest
    assert.equal(await page.getByLabel('Tên mẫu hoa *').inputValue(), 'Bình Lan Đột Biến');
    await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
    const cancelModal = page.getByRole('heading', { name: 'Hủy thay đổi chưa lưu?' });
    if (await cancelModal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.getByRole('button', { name: 'Hủy thay đổi' }).click();
    }
    await page.getByRole('heading', { name: 'Danh sách mẫu hoa' }).waitFor();

    // Reload admin to ensure latest DB versions are loaded
    await page.goto(`${baseUrl}/admin`);
    await page.getByRole('heading', { name: 'Danh sách mẫu hoa' }).waitFor();

    // Toggle featured and reorder
    const starBtn = page.getByRole('button', { name: /nổi bật/i }).first();
    await starBtn.click();

    // Accessible Hide confirmation modal
    const targetArticle = page.locator('article', { hasText: 'Bình Lan Đột Biến' });
    await targetArticle.getByRole('button', { name: /^Ẩn/ }).click();
    await page.getByRole('heading', { name: 'Ẩn mẫu hoa này?' }).waitFor();
    await page.getByRole('button', { name: 'Ẩn mẫu hoa', exact: true }).click();
    await page.getByText(/Đã tạm ẩn mẫu "Bình Lan Đột Biến"/).waitFor();

    // Verify hidden product disappears from public catalog
    await page.goto(baseUrl);
    await page.locator('h1').waitFor();
    assert.equal(await page.getByText('Bình Lan Đột Biến').count(), 0, 'Hidden product must not appear on public catalog');

    // Verify detail returns not-found for hidden product
    const hiddenRow = sqlite.prepare("SELECT code FROM products WHERE name = 'Bình Lan Đột Biến'").get();
    if (hiddenRow && hiddenRow.code) {
      await page.goto(`${baseUrl}/flowers/${hiddenRow.code}`);
      await page.getByText('Mẫu hoa hiện không hiển thị hoặc không tồn tại').waitFor();
    }

    // Configure Zalo in Shop Settings & verify public catalog reflection
    await page.goto(`${baseUrl}/admin/settings`);
    await page.getByLabel('Tên tiệm hoa *').fill('Tiệm Hoa E2E Hoàng Gia');
    await page.getByLabel('Đường dẫn Zalo tư vấn').fill('https://zalo.me/0909123456');
    await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
    await page.getByText(/Đã lưu.*cài đặt/).waitFor();

    // Check public catalog footer for Zalo link and shop name
    await page.goto(baseUrl);
    await page.locator('h1').waitFor();
    assert(await page.locator('#lien-he').getByText('Tiệm Hoa E2E Hoàng Gia').isVisible());
    const zaloLink = page.locator('footer a[href="https://zalo.me/0909123456"]');
    assert(await zaloLink.isVisible(), 'Public footer must show configured Zalo link');

    // -------------------------------------------------------------------------
    // 5. Offline & Error with Retry UI
    // -------------------------------------------------------------------------
    console.log('--- Testing Offline & Simulated 500 Error with Retry ---');
    simulate500 = true;
    await page.reload();
    await page.getByText('Chưa tải được danh mục hoa.').waitFor();
    assert(await page.getByRole('button', { name: 'Thử lại' }).isVisible());

    // Recover from error
    simulate500 = false;
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await page.locator('h1').waitFor();
    assert(await page.locator('#lien-he').getByText('Tiệm Hoa E2E Hoàng Gia').isVisible());

    // Test Playwright offline mode
    await context.setOffline(true);
    await page.getByText(/Bạn đang ngoại tuyến/).waitFor();
    await context.setOffline(false);

    console.log('--- ALL PRODUCTION BROWSER E2E TESTS PASSED ---');
    assert.deepEqual(pageErrors, [], `Encountered page errors: ${pageErrors.join(', ')}`);
  } finally {
    await browser.close();
    server.close();
    sqlite.close();
    globalThis.fetch = originalFetch;
  }
})().catch((err) => {
  console.error('PROD BROWSER E2E FAILED:', err);
  process.exit(1);
});
