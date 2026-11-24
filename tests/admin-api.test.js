import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import worker from '../worker/index.js';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256' };
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => Response.json({ keys: [jwk] });

const env = {
  ACCESS_TEAM: 'flower-test',
  ACCESS_ADMIN_AUD: 'admin-test',
  ADMIN_EMAIL: 'admin@example.invalid, second-admin@example.invalid',
  SHOP_NAME: 'Env Tiệm Hoa',
  SHOP_TAGLINE: 'Tagline from Env',
};

async function createToken(email = 'admin@example.invalid') {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer('https://flower-test.cloudflareaccess.com')
    .setAudience(env.ACCESS_ADMIN_AUD)
    .setExpirationTime('5m')
    .sign(privateKey);
}

const token = await createToken('admin@example.invalid');
const secondToken = await createToken('second-admin@example.invalid');

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../migrations/0001_products.sql', import.meta.url), 'utf8'));
sqlite.exec(readFileSync(new URL('../migrations/0002_product_images.sql', import.meta.url), 'utf8'));
sqlite.exec(readFileSync(new URL('../migrations/0003_production_readiness.sql', import.meta.url), 'utf8'));

// Insert base products for testing
sqlite.exec(`INSERT INTO products (id,code,name,price,primaryCategory,categories,images,description,stemsNote,isVisible,isFeatured,sortOrder,version,updatedAt) VALUES
  ('lan-001','LAN-001','Lan',500000,'Hoa theo yêu cầu','["Hoa theo yêu cầu","Hoa bó"]','["/flowers/lan-001.jpg"]','Mô tả lan 1','10 cành',1,0,10,1,'test'),
  ('lan-002','LAN-002','Lan ẩn',600000,'Hoa theo yêu cầu','["Hoa theo yêu cầu"]','[]','','',0,1,5,1,'test')`);

env.DB = {
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

function request(path, method = 'GET', body, headers = {}, authToken = token) {
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

try {
  // --- C3: Admin access verification ---
  assert.equal((await worker.fetch(new Request('https://flower.example/api/admin/products'), env)).status, 403);
  assert.equal((await worker.fetch(request('/api/admin/products', 'GET', undefined, { 'Cf-Access-Jwt-Assertion': 'forged' }, null), env)).status, 403);

  // First admin in comma-separated list
  const adminFirst = await worker.fetch(request('/api/admin/products'), env);
  assert.equal(adminFirst.status, 200);
  assert.equal((await adminFirst.json()).length, 2);

  // Second admin in comma-separated list
  const adminSecond = await worker.fetch(request('/api/admin/products', 'GET', undefined, {}, secondToken), env);
  assert.equal(adminSecond.status, 200);

  // Case-insensitive email check
  const upperToken = await createToken('SECOND-ADMIN@EXAMPLE.INVALID');
  const adminUpper = await worker.fetch(request('/api/admin/products', 'GET', undefined, {}, upperToken), env);
  assert.equal(adminUpper.status, 200);

  // Security headers check
  assert.equal(adminFirst.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(adminFirst.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(adminFirst.headers.get('x-frame-options'), 'DENY');

  // --- A1: Optimistic locking on PATCH /api/admin/products/:id ---
  // Missing expectedVersion -> 400
  assert.equal((await worker.fetch(request('/api/admin/products/lan-001', 'PATCH', { name: 'Lan đổi tên', price: 550000 }), env)).status, 400);
  // Invalid expectedVersion -> 400
  assert.equal((await worker.fetch(request('/api/admin/products/lan-001', 'PATCH', { expectedVersion: -1, name: 'Lan đổi tên' }), env)).status, 400);
  assert.equal((await worker.fetch(request('/api/admin/products/lan-001', 'PATCH', { expectedVersion: 1.5, name: 'Lan đổi tên' }), env)).status, 400);

  // Version conflict -> 409 with VERSION_CONFLICT code and latest product
  const conflictRes = await worker.fetch(request('/api/admin/products/lan-001', 'PATCH', { expectedVersion: 99, name: 'Lan đổi tên' }), env);
  assert.equal(conflictRes.status, 409);
  const conflictJson = await conflictRes.json();
  assert.equal(conflictJson.code, 'VERSION_CONFLICT');
  assert.equal(conflictJson.latest.version, 1);
  assert.ok(conflictJson.error.includes('Mẫu hoa vừa được cập nhật'));

  // Successful PATCH with matching expectedVersion: 1 -> increments to 2
  const savedRes = await worker.fetch(request('/api/admin/products/lan-001', 'PATCH', {
    expectedVersion: 1,
    name: 'Lan mới',
    price: 750000,
  }), env);
  assert.equal(savedRes.status, 200);
  const saved = await savedRes.json();
  assert.equal(saved.name, 'Lan mới');
  assert.equal(saved.price, 750000);
  assert.equal(saved.version, 2);
  // A2: Verify preserved fields (description, stemsNote, categories, images)
  assert.equal(saved.description, 'Mô tả lan 1');
  assert.equal(saved.stemsNote, '10 cành');
  assert.deepEqual(saved.categories, ['Hoa theo yêu cầu', 'Hoa bó']);
  assert.deepEqual(saved.images, ['/flowers/lan-001.jpg']);

  // Repeat update with stale expectedVersion: 1 -> 409 conflict
  const staleRes = await worker.fetch(request('/api/admin/products/lan-001', 'PATCH', { expectedVersion: 1, name: 'Lan lại' }), env);
  assert.equal(staleRes.status, 409);

  // --- A2: Dynamic category switch & secondary categories preservation ---
  const catSwitch = await worker.fetch(request('/api/admin/products/lan-001', 'PATCH', {
    expectedVersion: 2,
    primaryCategory: 'Hoa giỏ',
  }), env);
  assert.equal(catSwitch.status, 200);
  const catSwitched = await catSwitch.json();
  assert.equal(catSwitched.version, 3);
  assert.equal(catSwitched.primaryCategory, 'Hoa giỏ');
  // Secondary category 'Hoa bó' is preserved from previous ['Hoa theo yêu cầu', 'Hoa bó']
  assert.deepEqual(catSwitched.categories, ['Hoa giỏ', 'Hoa bó']);

  // --- A3: Idempotent creation (POST /api/admin/products) ---
  const validWebpBase64 = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
  const newProductPayload = {
    name: 'Hoa Lan Hồ Điệp Trắng',
    price: 1200000,
    primaryCategory: 'Hoa bó',
    image: validWebpBase64,
    description: 'Bó lan hồ điệp tươi sáng.',
    isFeatured: true,
    sortOrder: 1,
  };

  // Bad Idempotency-Key
  assert.equal((await worker.fetch(request('/api/admin/products', 'POST', newProductPayload, { 'Idempotency-Key': 'bad' }), env)).status, 400);

  // Create with valid Idempotency-Key
  const idemKey = 'idem-prod-unique-key-12345';
  const post1 = await worker.fetch(request('/api/admin/products', 'POST', newProductPayload, { 'Idempotency-Key': idemKey }), env);
  assert.equal(post1.status, 201);
  const createdProd = await post1.json();
  assert.equal(createdProd.code, 'LAN-003');
  assert.equal(createdProd.version, 1);
  assert.equal(createdProd.isFeatured, true);
  assert.equal(createdProd.sortOrder, 1);
  assert.ok(createdProd.images[0].startsWith('/api/public/images/'));
  assert.ok(createdProd.images[0].includes('?v='));

  // Replay with same Idempotency-Key -> 200 with Idempotency-Replayed: true
  const post2 = await worker.fetch(request('/api/admin/products', 'POST', newProductPayload, { 'Idempotency-Key': idemKey }), env);
  assert.equal(post2.status, 200);
  assert.equal(post2.headers.get('Idempotency-Replayed'), 'true');
  const replayedProd = await post2.json();
  assert.equal(replayedProd.id, createdProd.id);
  assert.equal(replayedProd.code, createdProd.code);

  // --- B3: Image Delivery & Caching ---
  const pubImgUrl = createdProd.images[0];
  const adminImgUrl = pubImgUrl.replace('/public/', '/admin/').split('?')[0];

  // Public image returns 200 with ETag & Cache-Control: private, no-cache
  const imgRes = await worker.fetch(new Request('https://flower.example' + pubImgUrl), env);
  assert.equal(imgRes.status, 200);
  assert.equal(imgRes.headers.get('content-type'), 'image/webp');
  assert.equal(imgRes.headers.get('cache-control'), 'private, no-cache');
  assert.equal(imgRes.headers.get('x-content-type-options'), 'nosniff');
  const etag = imgRes.headers.get('etag');
  assert.ok(etag);

  // If-None-Match returns 304 Not Modified
  const img304 = await worker.fetch(new Request('https://flower.example' + pubImgUrl, {
    headers: { 'If-None-Match': etag },
  }), env);
  assert.equal(img304.status, 304);

  // Hidden product image returns 404 on public route
  assert.equal((await worker.fetch(new Request('https://flower.example/api/public/images/lan-002'), env)).status, 404);

  // Admin image returns 403 without auth, 200 with auth
  assert.equal((await worker.fetch(new Request('https://flower.example' + adminImgUrl), env)).status, 403);
  const adminImgRes = await worker.fetch(request(adminImgUrl), env);
  assert.equal(adminImgRes.status, 200);
  assert.equal(adminImgRes.headers.get('cache-control'), 'private, no-store');

  // PATCH /api/admin/products/:id - images validation (reject external URLs, empty, >10)
  assert.equal((await worker.fetch(request(`/api/admin/products/${createdProd.id}`, 'PATCH', {
    expectedVersion: 1,
    images: ['https://evil.example/x.png'],
  }), env)).status, 400);
  assert.equal((await worker.fetch(request(`/api/admin/products/${createdProd.id}`, 'PATCH', {
    expectedVersion: 1,
    images: [],
  }), env)).status, 400);
  assert.equal((await worker.fetch(request(`/api/admin/products/${createdProd.id}`, 'PATCH', {
    expectedVersion: 1,
    images: Array.from({ length: 11 }, () => '/flowers/lan-001.jpg'),
  }), env)).status, 400);

  // Keep image on PATCH
  const keepPatch = await worker.fetch(request(`/api/admin/products/${createdProd.id}`, 'PATCH', {
    expectedVersion: 1,
    image: pubImgUrl,
    name: 'Lan cập nhật giữ ảnh',
  }), env);
  assert.equal(keepPatch.status, 200);
  const kept = await keepPatch.json();
  assert.equal(kept.images[0], pubImgUrl);

  // --- B1: Dynamic Categories ---
  // GET /api/public/categories
  const pubCatsRes = await worker.fetch(new Request('https://flower.example/api/public/categories'), env);
  assert.equal(pubCatsRes.status, 200);
  const pubCats = await pubCatsRes.json();
  assert.ok(pubCats.length >= 5);

  // GET /api/admin/categories
  const adminCatsRes = await worker.fetch(request('/api/admin/categories'), env);
  assert.equal(adminCatsRes.status, 200);
  const adminCats = await adminCatsRes.json();
  assert.ok(adminCats.some((c) => c.name === 'Hoa bó' && c.productCount > 0));

  // POST /api/admin/categories
  const newCatRes = await worker.fetch(request('/api/admin/categories', 'POST', {
    name: 'Hoa Đám Cưới',
    sortOrder: 6,
  }), env);
  assert.equal(newCatRes.status, 201);
  const newCat = await newCatRes.json();
  assert.equal(newCat.name, 'Hoa Đám Cưới');

  // Duplicate name -> 409
  assert.equal((await worker.fetch(request('/api/admin/categories', 'POST', { name: 'Hoa Đám Cưới' }), env)).status, 409);

  // PATCH /api/admin/categories/:id - rename cascades to products and increments version
  const catRenameRes = await worker.fetch(request(`/api/admin/categories/${newCat.id}`, 'PATCH', {
    name: 'Hoa Cưới Sang Trọng',
  }), env);
  assert.equal(catRenameRes.status, 200);

  // DELETE /api/admin/categories/:id - 403 on foreign Origin
  assert.equal((await worker.fetch(request(`/api/admin/categories/${newCat.id}`, 'DELETE', undefined, { Origin: 'https://evil.example' }), env)).status, 403);

  // DELETE /api/admin/categories/:id - 409 if category has products
  const catWithProds = adminCats.find((c) => c.productCount > 0);
  const delConflict = await worker.fetch(request(`/api/admin/categories/${catWithProds.id}`, 'DELETE'), env);
  assert.equal(delConflict.status, 409);

  // DELETE empty category succeeds
  const delSuccess = await worker.fetch(request(`/api/admin/categories/${newCat.id}`, 'DELETE'), env);
  assert.equal(delSuccess.status, 200);

  // --- B4: Public Product Listing & Query ---
  // List visible products ordered by isFeatured DESC, sortOrder ASC, code ASC
  const pubProdsRes = await worker.fetch(new Request('https://flower.example/api/public/products'), env);
  assert.equal(pubProdsRes.status, 200);
  const pubProds = await pubProdsRes.json();
  assert.ok(pubProds.every((p) => p.isVisible === true));
  // LAN-002 is hidden so not in list
  assert.ok(!pubProds.some((p) => p.code === 'LAN-002'));

  // Search by ?category=
  const catFilterRes = await worker.fetch(new Request('https://flower.example/api/public/products?category=' + encodeURIComponent('Hoa bó')), env);
  assert.equal(catFilterRes.status, 200);
  const filtered = await catFilterRes.json();
  assert.ok(filtered.every((p) => p.categories.includes('Hoa bó') || p.primaryCategory === 'Hoa bó'));

  // Single product query by code (case-insensitive)
  const singleProd = await worker.fetch(new Request('https://flower.example/api/public/products/lan-001'), env);
  assert.equal(singleProd.status, 200);
  assert.equal((await singleProd.json()).code, 'LAN-001');

  // Single product hidden -> 404
  assert.equal((await worker.fetch(new Request('https://flower.example/api/public/products/lan-002'), env)).status, 404);

  // --- C1: Site Settings ---
  // GET /api/public/settings merges env vars over defaults
  const settingsRes = await worker.fetch(new Request('https://flower.example/api/public/settings'), env);
  assert.equal(settingsRes.status, 200);
  const settings = await settingsRes.json();
  assert.equal(settings.shopName, 'Env Tiệm Hoa');
  assert.equal(settings.tagline, 'Tagline from Env');
  assert.equal(settings.welcomeHeading, 'Hoa đẹp cho những khoảnh khắc đặc biệt');

  // PATCH /api/admin/settings validates zaloUrl
  assert.equal((await worker.fetch(request('/api/admin/settings', 'PATCH', { zaloUrl: 'http://insecure.example' }), env)).status, 400);
  assert.equal((await worker.fetch(request('/api/admin/settings', 'PATCH', { zaloUrl: 'javascript:alert(1)' }), env)).status, 400);

  // Prototype key bypass test (toString / constructor rejected and not polluting site_settings)
  assert.equal((await worker.fetch(request('/api/admin/settings', 'PATCH', { toString: 'evil', constructor: 'evil' }), env)).status, 400);
  const evilCheck = sqlite.prepare("SELECT COUNT(*) as count FROM site_settings WHERE key IN ('toString', 'constructor')").get();
  assert.equal(evilCheck.count, 0);

  // PATCH valid settings overrides env and default
  const patchSettingsRes = await worker.fetch(request('/api/admin/settings', 'PATCH', {
    shopName: 'Tiệm Hoa Hoàng Gia',
    zaloUrl: 'https://zalo.me/0901234567',
  }), env);
  assert.equal(patchSettingsRes.status, 200);
  const updatedSettings = await patchSettingsRes.json();
  assert.equal(updatedSettings.shopName, 'Tiệm Hoa Hoàng Gia');
  assert.equal(updatedSettings.zaloUrl, 'https://zalo.me/0901234567');

  console.log('ALL TESTS PASSED: A1-A4, B1, B3, B4, C1, C3');
} finally {
  sqlite.close();
  globalThis.fetch = originalFetch;
}
