import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import worker from '../worker/index.js';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'qa-test-key', alg: 'RS256' };
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => Response.json({ keys: [jwk] });

const envBase = {
  ACCESS_TEAM: 'flower-e2e-test',
  ACCESS_ADMIN_AUD: 'admin-e2e-aud',
  ADMIN_EMAIL: 'qa-owner@example.invalid',
  SHOP_NAME: 'Tiệm Hoa E2E Thử Nghiệm',
  SHOP_TAGLINE: 'Tagline E2E',
};

async function createToken(email = 'qa-owner@example.invalid') {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'qa-test-key' })
    .setIssuer('https://flower-e2e-test.cloudflareaccess.com')
    .setAudience(envBase.ACCESS_ADMIN_AUD)
    .setExpirationTime('10m')
    .sign(privateKey);
}

const adminToken = await createToken();

function wrapSqlite(sqlite) {
  return {
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
  };
}

function request(path, method = 'GET', body, headers = {}, authToken = adminToken) {
  const reqHeaders = {
    'Origin': 'https://flower.example',
    'Content-Type': 'application/json',
    ...headers,
  };
  if (authToken) {
    reqHeaders['Cf-Access-Jwt-Assertion'] = authToken;
  }
  return new Request('https://flower.example' + path, {
    method,
    headers: reqHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('Migration Suite: Clean migration (0001 -> 0002 -> 0003)', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(readFileSync(new URL('../migrations/0001_products.sql', import.meta.url), 'utf8'));
    sqlite.exec(readFileSync(new URL('../migrations/0002_product_images.sql', import.meta.url), 'utf8'));
    sqlite.exec(readFileSync(new URL('../migrations/0003_production_readiness.sql', import.meta.url), 'utf8'));

    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
    assert.ok(tables.includes('products'), 'products table must exist');
    assert.ok(tables.includes('categories'), 'categories table must exist');
    assert.ok(tables.includes('site_settings'), 'site_settings table must exist');

    const defaultCats = sqlite.prepare('SELECT name FROM categories ORDER BY sortOrder ASC').all().map((r) => r.name);
    assert.deepEqual(defaultCats, [
      'Hoa bó',
      'Hoa giỏ',
      'Hoa sinh nhật',
      'Hoa chúc mừng',
      'Hoa theo yêu cầu',
    ]);
  } finally {
    sqlite.close();
  }
});

test('Migration Suite: Upgrade migration on pre-populated DB with custom multi-category/multi-image products', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    // Run 0001 and 0002
    sqlite.exec(readFileSync(new URL('../migrations/0001_products.sql', import.meta.url), 'utf8'));
    sqlite.exec(readFileSync(new URL('../migrations/0002_product_images.sql', import.meta.url), 'utf8'));

    // Populate catalog preview seed
    sqlite.exec(readFileSync(new URL('../seeds/catalog-preview.sql', import.meta.url), 'utf8'));

    // Insert custom multi-category & multi-image product
    sqlite.exec(`INSERT INTO products (
      id, code, name, price, primaryCategory, categories, images, description, stemsNote, isVisible, updatedAt
    ) VALUES (
      'custom-lan-001',
      'LAN-CUSTOM-001',
      'Lan Cưới Đặc Biệt',
      990000,
      'Hoa cưới',
      '["Hoa cưới","Hoa bó"]',
      '["/flowers/lan-001.jpg","/flowers/lan-002.jpg"]',
      'Lan cưới thiết kế riêng',
      '20 cành trắng',
      1,
      '2026-11-22'
    )`);

    // Verify 6 products exist before 0003
    const beforeCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
    assert.equal(beforeCount, 6);

    // Run 0003 upgrade migration
    sqlite.exec(readFileSync(new URL('../migrations/0003_production_readiness.sql', import.meta.url), 'utf8'));

    // Verify zero data loss
    const afterCount = sqlite.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
    assert.equal(afterCount, 6, 'Product count must remain intact after migration');

    const custom = sqlite.prepare("SELECT * FROM products WHERE id = 'custom-lan-001'").get();
    assert.equal(custom.code, 'LAN-CUSTOM-001');
    assert.equal(custom.primaryCategory, 'Hoa cưới');
    assert.deepEqual(JSON.parse(custom.categories), ['Hoa cưới', 'Hoa bó']);
    assert.deepEqual(JSON.parse(custom.images), ['/flowers/lan-001.jpg', '/flowers/lan-002.jpg']);
    assert.equal(custom.version, 1, 'Default version must be 1');
    assert.equal(custom.isFeatured, 0, 'Default isFeatured must be 0');
    assert.equal(custom.sortOrder, 0, 'Default sortOrder must be 0');

    // Verify dynamic categories backfilled from primaryCategory and categories json_each
    const allCategories = sqlite.prepare('SELECT name FROM categories').all().map((r) => r.name);
    assert.ok(allCategories.includes('Hoa cưới'), 'Backfilled categories must contain "Hoa cưới"');
    assert.ok(allCategories.includes('Hoa bó'), 'Backfilled categories must contain "Hoa bó"');
    assert.ok(allCategories.includes('Hoa theo yêu cầu'), 'Backfilled categories must contain "Hoa theo yêu cầu"');
  } finally {
    sqlite.close();
  }
});

test('Lifecycle Suite: Full owner-to-customer lifecycle & optimistic locking', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(readFileSync(new URL('../migrations/0001_products.sql', import.meta.url), 'utf8'));
    sqlite.exec(readFileSync(new URL('../migrations/0002_product_images.sql', import.meta.url), 'utf8'));
    sqlite.exec(readFileSync(new URL('../migrations/0003_production_readiness.sql', import.meta.url), 'utf8'));

    const env = { ...envBase, DB: wrapSqlite(sqlite) };

    // 1. Create category
    const catRes = await worker.fetch(request('/api/admin/categories', 'POST', {
      name: 'Lan Hồ Điệp Đặc Biệt',
      sortOrder: 10,
    }), env);
    assert.equal(catRes.status, 201);
    const cat = await catRes.json();
    assert.equal(cat.name, 'Lan Hồ Điệp Đặc Biệt');

    // 2. Create product with valid WebP upload & Idempotency-Key
    const validWebpBase64 = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
    const idemKey = 'idem-unique-key-lifecycle-987';
    const postPayload = {
      name: 'Chậu Lan Bạch Ngọc',
      price: 1850000,
      primaryCategory: 'Lan Hồ Điệp Đặc Biệt',
      categories: ['Lan Hồ Điệp Đặc Biệt'],
      image: validWebpBase64,
      description: 'Chậu lan hồ điệp trắng sang trọng.',
      stemsNote: '12 cành',
      isVisible: true,
      isFeatured: true,
      sortOrder: 1,
    };

    const createRes1 = await worker.fetch(request('/api/admin/products', 'POST', postPayload, {
      'Idempotency-Key': idemKey,
    }), env);
    assert.equal(createRes1.status, 201);
    const createdProduct = await createRes1.json();
    assert.equal(createdProduct.name, 'Chậu Lan Bạch Ngọc');
    assert.equal(createdProduct.version, 1);
    assert.ok(createdProduct.code);
    assert.ok(createdProduct.images[0].startsWith('/api/public/images/'));

    // 3. Retry with same Idempotency-Key -> 200, Idempotency-Replayed header, same id/code, no duplicate row
    const createRes2 = await worker.fetch(request('/api/admin/products', 'POST', postPayload, {
      'Idempotency-Key': idemKey,
    }), env);
    assert.equal(createRes2.status, 200);
    assert.equal(createRes2.headers.get('Idempotency-Replayed'), 'true');
    const replayed = await createRes2.json();
    assert.equal(replayed.id, createdProduct.id);
    assert.equal(replayed.code, createdProduct.code);

    const countInDb = sqlite.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
    assert.equal(countInDb, 1, 'Idempotent creation must not create duplicate products in DB');

    // 4. Verify GET /api/public/products
    const pubListRes = await worker.fetch(new Request('https://flower.example/api/public/products'), env);
    assert.equal(pubListRes.status, 200);
    const pubList = await pubListRes.json();
    assert.equal(pubList.length, 1);
    assert.equal(pubList[0].code, createdProduct.code);

    // 5. Verify GET /api/public/products/:code
    const pubDetailRes = await worker.fetch(new Request(`https://flower.example/api/public/products/${createdProduct.code}`), env);
    assert.equal(pubDetailRes.status, 200);
    const pubDetail = await pubDetailRes.json();
    assert.equal(pubDetail.id, createdProduct.id);

    // 6. Verify GET /api/public/images/:id (200, ETag, Cache-Control: private, no-cache, and If-None-Match -> 304)
    const imgUrl = createdProduct.images[0];
    const pubImgRes = await worker.fetch(new Request('https://flower.example' + imgUrl), env);
    assert.equal(pubImgRes.status, 200);
    assert.equal(pubImgRes.headers.get('content-type'), 'image/webp');
    assert.equal(pubImgRes.headers.get('cache-control'), 'private, no-cache');
    const etag = pubImgRes.headers.get('etag');
    assert.ok(etag, 'ETag must be present');

    const ifNoneMatchRes = await worker.fetch(new Request('https://flower.example' + imgUrl, {
      headers: { 'If-None-Match': etag },
    }), env);
    assert.equal(ifNoneMatchRes.status, 304);

    // 7. Rename category via PATCH /api/admin/categories/:id -> cascades to products
    const renameCatRes = await worker.fetch(request(`/api/admin/categories/${cat.id}`, 'PATCH', {
      name: 'Lan Hồ Điệp Hoàng Gia',
    }), env);
    assert.equal(renameCatRes.status, 200);

    const refreshedProd = sqlite.prepare('SELECT * FROM products WHERE id = ?').get(createdProduct.id);
    assert.equal(refreshedProd.primaryCategory, 'Lan Hồ Điệp Hoàng Gia');
    assert.deepEqual(JSON.parse(refreshedProd.categories), ['Lan Hồ Điệp Hoàng Gia']);
    assert.equal(refreshedProd.version, 2, 'Category rename must increment product version');

    // 8. Stale expectedVersion PATCH -> 409 Conflict with VERSION_CONFLICT & latest
    const stalePatchRes = await worker.fetch(request(`/api/admin/products/${createdProduct.id}`, 'PATCH', {
      expectedVersion: 1, // Stale! DB is at version 2
      name: 'Tên sửa bị xung đột',
    }), env);
    assert.equal(stalePatchRes.status, 409);
    const conflictJson = await stalePatchRes.json();
    assert.equal(conflictJson.code, 'VERSION_CONFLICT');
    assert.equal(conflictJson.latest.version, 2);
    assert.equal(conflictJson.latest.primaryCategory, 'Lan Hồ Điệp Hoàng Gia');

    // 9. Hide product with current expectedVersion: 2
    const hideRes = await worker.fetch(request(`/api/admin/products/${createdProduct.id}`, 'PATCH', {
      expectedVersion: 2,
      isVisible: false,
    }), env);
    assert.equal(hideRes.status, 200);
    const hiddenProd = await hideRes.json();
    assert.equal(hiddenProd.isVisible, false);
    assert.equal(hiddenProd.version, 3);

    // 10. Verify public catalog, detail, and public image return 404 / empty immediately
    const postHideCatalogRes = await worker.fetch(new Request('https://flower.example/api/public/products'), env);
    assert.equal(postHideCatalogRes.status, 200);
    const postHideCatalog = await postHideCatalogRes.json();
    assert.equal(postHideCatalog.length, 0, 'Hidden product must not appear on public catalog');

    const postHideDetailRes = await worker.fetch(new Request(`https://flower.example/api/public/products/${createdProduct.code}`), env);
    assert.equal(postHideDetailRes.status, 404, 'Hidden product detail must return 404');

    const postHideImgRes = await worker.fetch(new Request('https://flower.example' + imgUrl), env);
    assert.equal(postHideImgRes.status, 404, 'Hidden product public image must return 404');

    // 11. Update shop settings (PATCH /api/admin/settings)
    const patchSettingsRes = await worker.fetch(request('/api/admin/settings', 'PATCH', {
      shopName: 'Tiệm Hoa E2E Cao Cấp',
      zaloUrl: 'https://zalo.me/0988776655',
    }), env);
    assert.equal(patchSettingsRes.status, 200);

    const getSettingsRes = await worker.fetch(new Request('https://flower.example/api/public/settings'), env);
    assert.equal(getSettingsRes.status, 200);
    const settings = await getSettingsRes.json();
    assert.equal(settings.shopName, 'Tiệm Hoa E2E Cao Cấp');
    assert.equal(settings.zaloUrl, 'https://zalo.me/0988776655');
  } finally {
    sqlite.close();
  }
});

test('Backup & Restore Suite: SQLite dump and restore with byte-for-byte BLOB/table integrity', () => {
  const sourceSqlite = new DatabaseSync(':memory:');
  const targetSqlite = new DatabaseSync(':memory:');
  try {
    sourceSqlite.exec(readFileSync(new URL('../migrations/0001_products.sql', import.meta.url), 'utf8'));
    sourceSqlite.exec(readFileSync(new URL('../migrations/0002_product_images.sql', import.meta.url), 'utf8'));
    sourceSqlite.exec(readFileSync(new URL('../migrations/0003_production_readiness.sql', import.meta.url), 'utf8'));

    // Insert sample products with Uint8Array binary BLOB
    const testBlob = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const insertStmt = sourceSqlite.prepare(`INSERT INTO products (
      id, code, name, price, primaryCategory, categories, images, imageData, description, stemsNote, isVisible, isFeatured, sortOrder, version, idempotencyKey, imageHash, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    insertStmt.run(
      'backup-001', 'BAK-001', 'Hoa Sao Lưu', 450000, 'Hoa bó', '["Hoa bó"]', '["/api/public/images/backup-001"]',
      testBlob, 'Mô tả backup', '5 cành', 1, 1, 1, 1, 'idem-backup-001', 'hash001', '2026-11-25T00:00:00.000Z'
    );

    sourceSqlite.prepare("INSERT INTO site_settings (key, value, updatedAt) VALUES ('shopName', 'Tiệm Hoa Backup', '2026-11-25')").run();

    // Export schema and dump tables from source
    targetSqlite.exec(readFileSync(new URL('../migrations/0001_products.sql', import.meta.url), 'utf8'));
    targetSqlite.exec(readFileSync(new URL('../migrations/0002_product_images.sql', import.meta.url), 'utf8'));
    targetSqlite.exec(readFileSync(new URL('../migrations/0003_production_readiness.sql', import.meta.url), 'utf8'));

    // Dump products
    const sourceProducts = sourceSqlite.prepare('SELECT * FROM products').all();
    const restoreProductStmt = targetSqlite.prepare(`INSERT OR REPLACE INTO products (
      id, code, name, price, primaryCategory, categories, images, imageData, description, stemsNote, isVisible, isFeatured, sortOrder, version, idempotencyKey, imageHash, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const p of sourceProducts) {
      restoreProductStmt.run(
        p.id, p.code, p.name, p.price, p.primaryCategory, p.categories, p.images, p.imageData,
        p.description, p.stemsNote, p.isVisible, p.isFeatured, p.sortOrder, p.version, p.idempotencyKey, p.imageHash, p.updatedAt
      );
    }

    // Dump categories
    const sourceCategories = sourceSqlite.prepare('SELECT * FROM categories').all();
    const restoreCatStmt = targetSqlite.prepare('INSERT OR REPLACE INTO categories (id, name, slug, sortOrder, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const c of sourceCategories) {
      restoreCatStmt.run(c.id, c.name, c.slug, c.sortOrder, c.isActive, c.createdAt, c.updatedAt);
    }

    // Dump site_settings
    const sourceSettings = sourceSqlite.prepare('SELECT * FROM site_settings').all();
    const restoreSettingStmt = targetSqlite.prepare('INSERT OR REPLACE INTO site_settings (key, value, updatedAt) VALUES (?, ?, ?)');
    for (const s of sourceSettings) {
      restoreSettingStmt.run(s.key, s.value, s.updatedAt);
    }

    // Verify byte-for-byte product integrity in target
    const targetProducts = targetSqlite.prepare('SELECT * FROM products').all();
    assert.equal(targetProducts.length, sourceProducts.length);
    assert.equal(targetProducts[0].code, 'BAK-001');
    assert.equal(targetProducts[0].name, 'Hoa Sao Lưu');
    assert.deepEqual(new Uint8Array(targetProducts[0].imageData), new Uint8Array(testBlob), 'WebP binary imageData must match byte-for-byte');

    // Verify categories integrity
    const targetCategories = targetSqlite.prepare('SELECT * FROM categories').all();
    assert.equal(targetCategories.length, sourceCategories.length);

    // Verify settings integrity
    const targetSetting = targetSqlite.prepare("SELECT value FROM site_settings WHERE key = 'shopName'").get();
    assert.equal(targetSetting.value, 'Tiệm Hoa Backup');
  } finally {
    sourceSqlite.close();
    targetSqlite.close();
  }
});
