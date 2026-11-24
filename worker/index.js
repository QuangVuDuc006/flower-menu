import { hasAdminAccess } from './admin-access.js';
import { validateWebp, sha256Hex } from './webp.js';

const presetImages = new Set([
  '/flowers/placeholder.png',
  ...Array.from({ length: 5 }, (_, index) => `/flowers/lan-00${index + 1}.jpg`),
]);

function isValidProductImageUrl(url, productId) {
  if (typeof url !== 'string') return false;
  if (presetImages.has(url)) return true;
  const parts = url.split('?');
  const clean = parts[0];
  if (clean === `/api/public/images/${productId}` || clean === `/api/admin/images/${productId}`) {
    if (parts.length === 1) return true;
    return /^v=[a-f0-9]{16}$/.test(parts[1]);
  }
  return false;
}

function normalizeProductImageUrl(url, productId) {
  if (presetImages.has(url)) return url;
  const parts = url.split('?');
  const path = `/api/public/images/${productId}`;
  return parts.length > 1 ? `${path}?${parts[1]}` : path;
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

const DEFAULT_SETTINGS = {
  shopName: 'Tiệm Hoa',
  tagline: 'Danh mục hoa tươi tại tiệm',
  hours: '',
  address: '',
  zaloUrl: '',
  contactNote: 'Liên hệ cửa hàng để được hỗ trợ chọn mẫu hoa.',
  priceNote: '',
  welcomeHeading: 'Hoa đẹp cho những khoảnh khắc đặc biệt',
  welcomeSubtitle: 'Mời bạn xem các mẫu hoa hiện có tại tiệm. Khi chọn được mẫu ưng ý, bạn chỉ cần đưa mã mẫu cho nhân viên để được chuẩn bị chu đáo.',
};

const ENV_SETTING_MAP = {
  shopName: 'SHOP_NAME',
  tagline: 'SHOP_TAGLINE',
  hours: 'SHOP_HOURS',
  address: 'SHOP_ADDRESS',
  zaloUrl: 'SHOP_ZALO_URL',
  contactNote: 'SHOP_CONTACT_NOTE',
  priceNote: 'SHOP_PRICE_NOTE',
  welcomeHeading: 'SHOP_WELCOME_HEADING',
  welcomeSubtitle: 'SHOP_WELCOME_SUBTITLE',
};

function productFromRow(row) {
  const { imageData: _imageData, ...fields } = row;
  return {
    ...fields,
    categories: typeof row.categories === 'string' ? JSON.parse(row.categories) : (row.categories || []),
    images: typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []),
    isVisible: Boolean(row.isVisible),
    isFeatured: Boolean(row.isFeatured),
    sortOrder: Number(row.sortOrder ?? 0),
    version: Number(row.version ?? 1),
    stemsNote: row.stemsNote ?? null,
  };
}

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
      ...headers,
    },
  });
}

async function getMergedSettings(env) {
  const settings = { ...DEFAULT_SETTINGS };
  for (const [key, envKey] of Object.entries(ENV_SETTING_MAP)) {
    if (env[envKey] !== undefined && env[envKey] !== null && String(env[envKey]).trim() !== '') {
      settings[key] = String(env[envKey]).trim();
    }
  }
  const { results } = await env.DB.prepare('SELECT key, value FROM site_settings').all();
  if (results) {
    for (const row of results) {
      if (Object.hasOwn(settings, row.key) && row.value !== null && row.value !== undefined) {
        settings[row.key] = row.value;
      }
    }
  }
  return settings;
}

async function getActiveCategoryNames(env) {
  const { results } = await env.DB.prepare('SELECT name FROM categories WHERE isActive = 1').all();
  return new Set((results || []).map((r) => r.name));
}

async function parseJsonBody(request) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return { error: json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403) };
  }
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return { error: json({ error: 'Yêu cầu cần dùng dữ liệu JSON.' }, 415) };
  }
  const reader = request.body?.getReader();
  const chunks = [];
  let length = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 210000) {
        await reader.cancel();
        return { error: json({ error: 'Dữ liệu quá lớn.' }, 413) };
      }
      chunks.push(value);
    }
  }
  const text = await new Blob(chunks).text();
  try {
    const data = JSON.parse(text);
    if (!data || Array.isArray(data) || typeof data !== 'object') {
      return { error: json({ error: 'Thông tin mẫu hoa không hợp lệ.' }, 400) };
    }
    return { data };
  } catch {
    return { error: json({ error: 'Dữ liệu JSON không hợp lệ.' }, 400) };
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    // Image delivery: public (with caching/ETag) and admin (private, no-store)
    const imageMatch = path.match(/^\/api\/(public|admin)\/images\/([a-zA-Z0-9_-]+)$/);
    if (imageMatch && request.method === 'GET') {
      const [, scope, imageId] = imageMatch;
      if (scope === 'admin') {
        if (!(await hasAdminAccess(request, env))) {
          return json({ error: 'Bạn chưa có quyền quản trị.' }, 403);
        }
        const row = await env.DB.prepare('SELECT imageData FROM products WHERE id = ?').bind(imageId).first();
        if (!row?.imageData) {
          return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store', ...SECURITY_HEADERS } });
        }
        return new Response(new Uint8Array(row.imageData), {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'private, no-store',
            ...SECURITY_HEADERS,
          },
        });
      }

      // Public image delivery
      const row = await env.DB.prepare('SELECT imageData, imageHash, updatedAt FROM products WHERE id = ? AND isVisible = 1').bind(imageId).first();
      if (!row?.imageData) {
        return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store', ...SECURITY_HEADERS } });
      }

      const etag = `"${row.imageHash || row.updatedAt}"`;
      if (request.headers.get('If-None-Match') === etag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: etag,
            'Cache-Control': 'private, no-cache',
            ...SECURITY_HEADERS,
          },
        });
      }

      return new Response(new Uint8Array(row.imageData), {
        headers: {
          'Content-Type': 'image/webp',
          ETag: etag,
          'Cache-Control': 'private, no-cache',
          ...SECURITY_HEADERS,
        },
      });
    }

    // Admin session check
    if (path === '/api/admin/session' && request.method === 'GET') {
      const allowed = await hasAdminAccess(request, env);
      return Response.json({ authenticated: allowed }, {
        status: allowed ? 200 : 403,
        headers: { 'Cache-Control': 'no-store', ...SECURITY_HEADERS },
      });
    }

    // Settings routes
    if (path === '/api/public/settings' && request.method === 'GET') {
      return json(await getMergedSettings(env));
    }

    if (path === '/api/admin/settings') {
      if (request.method === 'GET') {
        if (!(await hasAdminAccess(request, env))) return json({ error: 'Bạn chưa có quyền quản trị.' }, 403);
        return json(await getMergedSettings(env));
      }
      if (request.method === 'PATCH') {
        if (!(await hasAdminAccess(request, env))) return json({ error: 'Bạn chưa có quyền quản trị.' }, 403);
        const { data, error } = await parseJsonBody(request);
        if (error) return error;

        if (data.zaloUrl !== undefined) {
          if (typeof data.zaloUrl !== 'string') return json({ error: 'zaloUrl không hợp lệ.' }, 400);
          const trimmed = data.zaloUrl.trim();
          if (trimmed !== '') {
            try {
              const u = new URL(trimmed);
              if (u.protocol !== 'https:') {
                return json({ error: 'zaloUrl chỉ chấp nhận giao thức https.' }, 400);
              }
            } catch {
              return json({ error: 'zaloUrl không đúng định dạng URL.' }, 400);
            }
          }
        }

        const textFields = ['shopName', 'tagline', 'hours', 'address', 'contactNote', 'priceNote', 'welcomeHeading', 'welcomeSubtitle'];
        for (const field of textFields) {
          if (data[field] !== undefined) {
            if (typeof data[field] !== 'string' || data[field].length > 500) {
              return json({ error: `${field} không hợp lệ hoặc quá dài.` }, 400);
            }
          }
        }

        for (const k of Object.keys(data)) {
          if (!Object.hasOwn(DEFAULT_SETTINGS, k)) {
            return json({ error: `Trường ${k} không hợp lệ.` }, 400);
          }
        }

        const now = new Date().toISOString();
        for (const [k, v] of Object.entries(data)) {
          if (Object.hasOwn(DEFAULT_SETTINGS, k)) {
            const val = typeof v === 'string' ? v.trim() : String(v);
            await env.DB.prepare(
              'INSERT INTO site_settings (key, value, updatedAt) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt'
            ).bind(k, val, now).run();
          }
        }

        return json(await getMergedSettings(env));
      }
      return new Response(null, { status: 405, headers: { Allow: 'GET, PATCH', ...SECURITY_HEADERS } });
    }

    // Dynamic Categories routes
    if (path === '/api/public/categories' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, name, slug, sortOrder, isActive FROM categories WHERE isActive = 1 ORDER BY sortOrder ASC, name ASC'
      ).all();
      return json((results || []).map((r) => ({ ...r, sortOrder: Number(r.sortOrder), isActive: Boolean(r.isActive) })));
    }

    if (path === '/api/admin/categories') {
      if (request.method === 'GET') {
        if (!(await hasAdminAccess(request, env))) return json({ error: 'Bạn chưa có quyền quản trị.' }, 403);
        const { results } = await env.DB.prepare(`
          SELECT c.id, c.name, c.slug, c.sortOrder, c.isActive, c.createdAt, c.updatedAt,
            (
              SELECT COUNT(*) FROM products p
              WHERE p.primaryCategory = c.name
                 OR EXISTS (SELECT 1 FROM json_each(p.categories) WHERE value = c.name)
            ) AS productCount
          FROM categories c
          ORDER BY c.sortOrder ASC, c.name ASC
        `).all();
        return json((results || []).map((r) => ({
          ...r,
          isActive: Boolean(r.isActive),
          sortOrder: Number(r.sortOrder),
          productCount: Number(r.productCount),
        })));
      }

      if (request.method === 'POST') {
        if (!(await hasAdminAccess(request, env))) return json({ error: 'Bạn chưa có quyền quản trị.' }, 403);
        const { data, error } = await parseJsonBody(request);
        if (error) return error;

        if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 50) {
          return json({ error: 'Tên danh mục cần từ 2–50 ký tự.' }, 400);
        }
        const name = data.name.trim();
        const slug = typeof data.slug === 'string' && data.slug.trim().length > 0
          ? data.slug.trim().toLowerCase()
          : name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const sortOrder = Number.isSafeInteger(data.sortOrder) ? data.sortOrder : 100;
        const isActive = data.isActive === undefined ? 1 : (data.isActive ? 1 : 0);

        const existing = await env.DB.prepare(
          'SELECT id FROM categories WHERE name = ? COLLATE NOCASE OR slug = ? COLLATE NOCASE'
        ).bind(name, slug).first();
        if (existing) {
          return json({ error: 'Tên hoặc slug danh mục đã tồn tại.' }, 409);
        }

        const id = `cat-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const created = await env.DB.prepare(`
          INSERT INTO categories (id, name, slug, sortOrder, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING id, name, slug, sortOrder, isActive, createdAt, updatedAt
        `).bind(id, name, slug, sortOrder, isActive, now, now).first();

        return json({
          ...created,
          isActive: Boolean(created.isActive),
          sortOrder: Number(created.sortOrder),
          productCount: 0,
        }, 201);
      }

      return new Response(null, { status: 405, headers: { Allow: 'GET, POST', ...SECURITY_HEADERS } });
    }

    const catItemMatch = path.match(/^\/api\/admin\/categories\/([a-zA-Z0-9_-]+)$/);
    if (catItemMatch) {
      if (!(await hasAdminAccess(request, env))) return json({ error: 'Bạn chưa có quyền quản trị.' }, 403);
      const categoryId = catItemMatch[1];
      const existingCat = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(categoryId).first();
      if (!existingCat) return json({ error: 'Không tìm thấy danh mục.' }, 404);

      if (request.method === 'PATCH') {
        const { data, error } = await parseJsonBody(request);
        if (error) return error;

        let newName = existingCat.name;
        if (data.name !== undefined) {
          if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 50) {
            return json({ error: 'Tên danh mục cần từ 2–50 ký tự.' }, 400);
          }
          newName = data.name.trim();
        }

        let newSlug = existingCat.slug;
        if (data.slug !== undefined) {
          if (typeof data.slug !== 'string' || data.slug.trim().length < 1) {
            return json({ error: 'Slug không hợp lệ.' }, 400);
          }
          newSlug = data.slug.trim().toLowerCase();
        }

        const dup = await env.DB.prepare(
          'SELECT id FROM categories WHERE (name = ? COLLATE NOCASE OR slug = ? COLLATE NOCASE) AND id != ?'
        ).bind(newName, newSlug, categoryId).first();
        if (dup) {
          return json({ error: 'Tên hoặc slug danh mục đã tồn tại.' }, 409);
        }

        let newSortOrder = Number(existingCat.sortOrder);
        if (data.sortOrder !== undefined) {
          if (!Number.isSafeInteger(data.sortOrder) || data.sortOrder < 0 || data.sortOrder > 9999) {
            return json({ error: 'Thứ tự sắp xếp từ 0–9999.' }, 400);
          }
          newSortOrder = data.sortOrder;
        }

        let newIsActive = existingCat.isActive;
        if (data.isActive !== undefined) {
          if (typeof data.isActive !== 'boolean') return json({ error: 'Trạng thái hoạt động không hợp lệ.' }, 400);
          newIsActive = data.isActive ? 1 : 0;
        }

        const now = new Date().toISOString();
        const updatedCat = await env.DB.prepare(`
          UPDATE categories SET name = ?, slug = ?, sortOrder = ?, isActive = ?, updatedAt = ?
          WHERE id = ?
          RETURNING id, name, slug, sortOrder, isActive, createdAt, updatedAt
        `).bind(newName, newSlug, newSortOrder, newIsActive, now, categoryId).first();

        // Cascade rename to products if name changed
        if (newName !== existingCat.name) {
          const oldName = existingCat.name;
          const { results: affectedProducts } = await env.DB.prepare(`
            SELECT id, primaryCategory, categories FROM products
            WHERE primaryCategory = ? OR EXISTS (SELECT 1 FROM json_each(categories) WHERE value = ?)
          `).bind(oldName, oldName).all();

          if (affectedProducts && affectedProducts.length > 0) {
            for (const p of affectedProducts) {
              const pPrimary = p.primaryCategory === oldName ? newName : p.primaryCategory;
              const pCats = JSON.parse(p.categories).map((c) => (c === oldName ? newName : c));
              await env.DB.prepare(`
                UPDATE products SET primaryCategory = ?, categories = ?, version = version + 1, updatedAt = ?
                WHERE id = ?
              `).bind(pPrimary, JSON.stringify(pCats), now, p.id).run();
            }
          }
        }

        return json({
          ...updatedCat,
          isActive: Boolean(updatedCat.isActive),
          sortOrder: Number(updatedCat.sortOrder),
        });
      }

      if (request.method === 'DELETE') {
        if (request.headers.get('Origin') !== new URL(request.url).origin) {
          return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
        }
        const countRow = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM products
          WHERE primaryCategory = ? OR EXISTS (SELECT 1 FROM json_each(categories) WHERE value = ?)
        `).bind(existingCat.name, existingCat.name).first();

        if (Number(countRow?.count || 0) > 0) {
          return json({ error: 'Không thể xóa danh mục đang có sản phẩm.' }, 409);
        }

        await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();
        return json({ success: true });
      }

      return new Response(null, { status: 405, headers: { Allow: 'PATCH, DELETE', ...SECURITY_HEADERS } });
    }

    // Admin products endpoints
    if (path === '/api/admin/products' || path.startsWith('/api/admin/products/')) {
      if (!(await hasAdminAccess(request, env))) return json({ error: 'Bạn chưa có quyền quản trị.' }, 403);

      try {
        if (path === '/api/admin/products' && request.method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT id, code, name, price, primaryCategory, categories, images, description, stemsNote, isVisible, isFeatured, sortOrder, version, updatedAt FROM products ORDER BY code'
          ).all();
          return json((results || []).map(productFromRow));
        }

        const isCreate = path === '/api/admin/products';
        const match = path.match(/^\/api\/admin\/products\/([a-zA-Z0-9_-]+)$/);
        if (!isCreate && !match) return json({ error: 'Không tìm thấy đường dẫn.' }, 404);
        const method = isCreate ? 'POST' : 'PATCH';
        if (request.method !== method) return new Response(null, { status: 405, headers: { Allow: isCreate ? 'GET, POST' : 'PATCH', ...SECURITY_HEADERS } });

        // Idempotency check for POST
        let idempotencyKey = null;
        if (isCreate) {
          const headerKey = request.headers.get('Idempotency-Key');
          if (headerKey !== null) {
            if (!/^[a-zA-Z0-9_-]{8,128}$/.test(headerKey)) {
              return json({ error: 'Idempotency-Key không hợp lệ.' }, 400);
            }
            idempotencyKey = headerKey;
            const existing = await env.DB.prepare('SELECT * FROM products WHERE idempotencyKey = ?').bind(idempotencyKey).first();
            if (existing) {
              return json(productFromRow(existing), 200, { 'Idempotency-Replayed': 'true' });
            }
          }
        }

        const { data, error } = await parseJsonBody(request);
        if (error) return error;

        const activeCategories = await getActiveCategoryNames(env);

        if (isCreate) {
          const validKeys = ['name', 'price', 'primaryCategory', 'image', 'description'];
          const keys = Object.keys(data);
          const allowedPostKeys = [...validKeys, 'isVisible', 'isFeatured', 'sortOrder', 'stemsNote', 'categories', 'images'];
          if (!validKeys.every((k) => keys.includes(k)) || !keys.every((k) => allowedPostKeys.includes(k))) {
            return json({ error: 'Vui lòng kiểm tra tên, giá, danh mục, ảnh và mô tả mẫu hoa.' }, 400);
          }

          if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 100) {
            return json({ error: 'Tên cần từ 2–100 ký tự.' }, 400);
          }
          if (!Number.isSafeInteger(data.price) || data.price <= 0) {
            return json({ error: 'Giá phải là số nguyên dương.' }, 400);
          }
          if (typeof data.primaryCategory !== 'string' || !activeCategories.has(data.primaryCategory)) {
            return json({ error: 'Danh mục chính không hợp lệ.' }, 400);
          }
          if (typeof data.description !== 'string' || data.description.length > 500) {
            return json({ error: 'Mô tả tối đa 500 ký tự.' }, 400);
          }
          if (data.isVisible !== undefined && typeof data.isVisible !== 'boolean') {
            return json({ error: 'Trạng thái hiển thị không hợp lệ.' }, 400);
          }
          if (data.isFeatured !== undefined && typeof data.isFeatured !== 'boolean') {
            return json({ error: 'Trạng thái nổi bật không hợp lệ.' }, 400);
          }
          if (data.sortOrder !== undefined && (!Number.isSafeInteger(data.sortOrder) || data.sortOrder < 0 || data.sortOrder > 9999)) {
            return json({ error: 'Thứ tự sắp xếp từ 0–9999.' }, 400);
          }
          if (data.stemsNote !== undefined && data.stemsNote !== null && (typeof data.stemsNote !== 'string' || data.stemsNote.length > 500)) {
            return json({ error: 'Ghi chú số lượng cành tối đa 500 ký tự.' }, 400);
          }
          if (data.categories !== undefined) {
            if (!Array.isArray(data.categories) || !data.categories.every((c) => typeof c === 'string' && activeCategories.has(c))) {
              return json({ error: 'Danh mục phụ không hợp lệ.' }, 400);
            }
          }
          if (data.images !== undefined) {
            if (!Array.isArray(data.images) || data.images.length < 1 || data.images.length > 10 ||
                !data.images.every((img) => typeof img === 'string' && presetImages.has(img))) {
              return json({ error: 'Danh sách ảnh không hợp lệ.' }, 400);
            }
          }

          const id = crypto.randomUUID();
          let imageData = null;
          let imageHash = null;
          let imagePath = '';

          if (typeof data.image === 'string' && data.image.startsWith('data:image/webp;base64,')) {
            let raw;
            try {
              const decoded = atob(data.image.slice(23));
              raw = new Uint8Array(decoded.length);
              for (let i = 0; i < decoded.length; i++) raw[i] = decoded.charCodeAt(i);
            } catch {
              return json({ error: 'Ảnh không hợp lệ.' }, 400);
            }
            const webpRes = validateWebp(raw);
            if (!webpRes.valid) {
              return json({ error: webpRes.error || 'Ảnh WebP không hợp lệ.' }, 400);
            }
            imageData = raw;
            imageHash = await sha256Hex(raw);
            imagePath = `/api/public/images/${id}?v=${imageHash}`;
          } else if (typeof data.image === 'string' && presetImages.has(data.image)) {
            imagePath = data.image;
          } else {
            return json({ error: 'Ảnh không hợp lệ.' }, 400);
          }

          const name = data.name.trim();
          const price = data.price;
          const primaryCategory = data.primaryCategory;
          const categoriesList = data.categories ? [...data.categories] : [primaryCategory];
          if (!categoriesList.includes(primaryCategory)) categoriesList.unshift(primaryCategory);
          const categoriesJson = JSON.stringify(categoriesList);
          const imagesJson = JSON.stringify([imagePath]);
          const description = data.description.trim();
          const stemsNote = data.stemsNote ? data.stemsNote.trim() : null;
          const isVisible = data.isVisible === undefined ? 1 : (data.isVisible ? 1 : 0);
          const isFeatured = data.isFeatured === undefined ? 0 : (data.isFeatured ? 1 : 0);
          const sortOrder = data.sortOrder === undefined ? 0 : data.sortOrder;
          const now = new Date().toISOString();

          let inserted = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              inserted = await env.DB.prepare(`
                INSERT INTO products (id, code, name, price, primaryCategory, categories, images, description, stemsNote, isVisible, isFeatured, sortOrder, version, updatedAt, idempotencyKey, imageData, imageHash)
                SELECT ?, 'LAN-' || printf('%03d', COALESCE(MAX(CAST(substr(code, 5) AS INTEGER)), 0) + 1), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?
                FROM products WHERE code GLOB 'LAN-[0-9]*'
                RETURNING id, code, name, price, primaryCategory, categories, images, description, stemsNote, isVisible, isFeatured, sortOrder, version, updatedAt
              `).bind(
                id,
                name,
                price,
                primaryCategory,
                categoriesJson,
                imagesJson,
                description,
                stemsNote,
                isVisible,
                isFeatured,
                sortOrder,
                now,
                idempotencyKey,
                imageData,
                imageHash
              ).first();
              break;
            } catch (err) {
              const msg = String(err?.message || err);
              if (idempotencyKey && (msg.includes('idempotency') || msg.includes('idx_products_idempotency'))) {
                const existing = await env.DB.prepare('SELECT * FROM products WHERE idempotencyKey = ?').bind(idempotencyKey).first();
                if (existing) {
                  return json(productFromRow(existing), 200, { 'Idempotency-Replayed': 'true' });
                }
              }
              if (msg.includes('code') || msg.includes('UNIQUE')) {
                continue;
              }
              throw err;
            }
          }

          if (!inserted) {
            return json({ error: 'Chưa tạo được mẫu hoa. Vui lòng thử lại.' }, 500);
          }

          return json(productFromRow(inserted), 201);
        }

        // PATCH /api/admin/products/:id
        const id = match[1];

        // A1: Require expectedVersion
        if (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion < 1) {
          return json({ error: 'expectedVersion phải là số nguyên an toàn >= 1.' }, 400);
        }

        const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
        if (!existing) {
          return json({ error: 'Không tìm thấy mẫu hoa.' }, 404);
        }

        if (existing.version !== data.expectedVersion) {
          return json({
            error: 'Mẫu hoa vừa được cập nhật ở thiết bị hoặc tab khác. Vui lòng tải lại dữ liệu mới nhất trước khi lưu.',
            code: 'VERSION_CONFLICT',
            latest: productFromRow(existing),
          }, 409);
        }

        // Allowlisted fields
        const ALLOWED_KEYS = new Set([
          'expectedVersion', 'name', 'price', 'primaryCategory', 'categories',
          'image', 'images', 'description', 'stemsNote', 'isVisible', 'isFeatured', 'sortOrder'
        ]);
        const keys = Object.keys(data);
        if (!keys.every((k) => ALLOWED_KEYS.has(k))) {
          return json({ error: 'Chứa trường dữ liệu không hợp lệ.' }, 400);
        }

        let name = existing.name;
        if (data.name !== undefined) {
          if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 100) {
            return json({ error: 'Tên cần từ 2–100 ký tự.' }, 400);
          }
          name = data.name.trim();
        }

        let price = existing.price;
        if (data.price !== undefined) {
          if (!Number.isSafeInteger(data.price) || data.price <= 0) {
            return json({ error: 'Giá phải là số nguyên dương.' }, 400);
          }
          price = data.price;
        }

        let description = existing.description;
        if (data.description !== undefined) {
          if (typeof data.description !== 'string' || data.description.length > 500) {
            return json({ error: 'Mô tả tối đa 500 ký tự.' }, 400);
          }
          description = data.description.trim();
        }

        let stemsNote = existing.stemsNote;
        if (data.stemsNote !== undefined) {
          if (data.stemsNote !== null && (typeof data.stemsNote !== 'string' || data.stemsNote.length > 500)) {
            return json({ error: 'Ghi chú số cành tối đa 500 ký tự.' }, 400);
          }
          stemsNote = data.stemsNote === null ? null : data.stemsNote.trim();
        }

        let isVisible = Boolean(existing.isVisible);
        if (data.isVisible !== undefined) {
          if (typeof data.isVisible !== 'boolean') {
            return json({ error: 'Trạng thái hiển thị không hợp lệ.' }, 400);
          }
          isVisible = data.isVisible;
        }

        let isFeatured = Boolean(existing.isFeatured);
        if (data.isFeatured !== undefined) {
          if (typeof data.isFeatured !== 'boolean') {
            return json({ error: 'Trạng thái nổi bật không hợp lệ.' }, 400);
          }
          isFeatured = data.isFeatured;
        }

        let sortOrder = Number(existing.sortOrder ?? 0);
        if (data.sortOrder !== undefined) {
          if (!Number.isSafeInteger(data.sortOrder) || data.sortOrder < 0 || data.sortOrder > 9999) {
            return json({ error: 'Thứ tự sắp xếp từ 0–9999.' }, 400);
          }
          sortOrder = data.sortOrder;
        }

        const existingCats = JSON.parse(existing.categories);
        let primaryCategory = existing.primaryCategory;
        if (data.primaryCategory !== undefined) {
          if (typeof data.primaryCategory !== 'string' || !activeCategories.has(data.primaryCategory)) {
            return json({ error: 'Danh mục chính không hợp lệ.' }, 400);
          }
          primaryCategory = data.primaryCategory;
        }

        let categories = existingCats;
        if (data.categories !== undefined) {
          if (!Array.isArray(data.categories) || !data.categories.every((c) => typeof c === 'string' && activeCategories.has(c))) {
            return json({ error: 'Danh mục phụ không hợp lệ.' }, 400);
          }
          categories = data.categories.includes(primaryCategory) ? data.categories : [primaryCategory, ...data.categories];
        } else if (data.primaryCategory !== undefined && data.primaryCategory !== existing.primaryCategory) {
          // Preserve secondary categories when primaryCategory changes and categories is omitted
          categories = [primaryCategory, ...existingCats.filter((c) => c !== existing.primaryCategory && c !== primaryCategory)];
        }

        const existingImages = JSON.parse(existing.images);
        let imageData = existing.imageData;
        let imageHash = existing.imageHash;
        let imagePath = existingImages[0] || '';

        if (data.image !== undefined) {
          const keepImage = typeof data.image === 'string' &&
            [`/api/public/images/${id}`, `/api/admin/images/${id}`].includes(data.image.split('?')[0]);
          if (typeof data.image === 'string' && data.image.startsWith('data:image/webp;base64,')) {
            let raw;
            try {
              const decoded = atob(data.image.slice(23));
              raw = new Uint8Array(decoded.length);
              for (let i = 0; i < decoded.length; i++) raw[i] = decoded.charCodeAt(i);
            } catch {
              return json({ error: 'Ảnh không hợp lệ.' }, 400);
            }
            const webpRes = validateWebp(raw);
            if (!webpRes.valid) {
              return json({ error: webpRes.error || 'Ảnh WebP không hợp lệ.' }, 400);
            }
            imageData = raw;
            imageHash = await sha256Hex(raw);
            imagePath = `/api/public/images/${id}?v=${imageHash}`;
          } else if (keepImage) {
            // Keep existing imageData and imageHash
          } else if (typeof data.image === 'string' && presetImages.has(data.image)) {
            imageData = null;
            imageHash = null;
            imagePath = data.image;
          } else {
            return json({ error: 'Ảnh không hợp lệ.' }, 400);
          }
        }

        let imagesList = existingImages;
        if (data.images !== undefined) {
          if (!Array.isArray(data.images) || data.images.length < 1 || data.images.length > 10 ||
              !data.images.every((img) => isValidProductImageUrl(img, id))) {
            return json({ error: 'Danh sách ảnh không hợp lệ hoặc chứa đường dẫn không được phép.' }, 400);
          }
          imagesList = data.images.map((img) => normalizeProductImageUrl(img, id));
        } else if (data.image !== undefined) {
          // Replace images[0] and preserve existing.images.slice(1)
          imagesList = [imagePath, ...existingImages.slice(1)];
        }

        const updatedAt = new Date().toISOString();
        const updated = await env.DB.prepare(`
          UPDATE products SET
            name = ?, price = ?, primaryCategory = ?, categories = ?, images = ?,
            description = ?, stemsNote = ?, isVisible = ?, isFeatured = ?, sortOrder = ?,
            imageData = ?, imageHash = ?, version = version + 1, updatedAt = ?
          WHERE id = ? AND version = ?
          RETURNING id, code, name, price, primaryCategory, categories, images, description, stemsNote, isVisible, isFeatured, sortOrder, version, updatedAt
        `).bind(
          name,
          price,
          primaryCategory,
          JSON.stringify(categories),
          JSON.stringify(imagesList),
          description,
          stemsNote,
          Number(isVisible),
          Number(isFeatured),
          sortOrder,
          imageData,
          imageHash,
          updatedAt,
          id,
          data.expectedVersion
        ).first();

        if (!updated) {
          const latest = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
          if (!latest) return json({ error: 'Không tìm thấy mẫu hoa.' }, 404);
          return json({
            error: 'Mẫu hoa vừa được cập nhật ở thiết bị hoặc tab khác. Vui lòng tải lại dữ liệu mới nhất trước khi lưu.',
            code: 'VERSION_CONFLICT',
            latest: productFromRow(latest),
          }, 409);
        }

        return json(productFromRow(updated));
      } catch (error) {
        console.error(error);
        return json({ error: 'Chưa lưu được dữ liệu. Vui lòng thử lại.' }, 500);
      }
    }

    // Public product routes
    if (request.method !== 'GET') {
      return new Response(null, { status: 405, headers: { Allow: 'GET', ...SECURITY_HEADERS } });
    }

    if (path === '/api/public/products') {
      try {
        const url = new URL(request.url);
        const categoryParam = url.searchParams.get('category')?.trim();
        const qParam = url.searchParams.get('q')?.trim();

        let sql = 'SELECT id, code, name, price, primaryCategory, categories, images, description, stemsNote, isVisible, isFeatured, sortOrder, version, updatedAt FROM products WHERE isVisible = 1';
        const binds = [];

        if (categoryParam) {
          sql += ' AND (primaryCategory = ? OR EXISTS (SELECT 1 FROM json_each(categories) WHERE value = ?))';
          binds.push(categoryParam, categoryParam);
        }
        if (qParam) {
          sql += ' AND (name LIKE ? OR code LIKE ? OR description LIKE ?)';
          const searchPattern = `%${qParam}%`;
          binds.push(searchPattern, searchPattern, searchPattern);
        }
        sql += ' ORDER BY isFeatured DESC, sortOrder ASC, code ASC';

        const { results } = await env.DB.prepare(sql).bind(...binds).all();
        return json((results || []).map(productFromRow));
      } catch (error) {
        console.error(error);
        return json({ error: 'Không tải được danh mục hoa.' }, 500);
      }
    }

    const pubProductMatch = path.match(/^\/api\/public\/products\/([a-zA-Z0-9_-]+)$/);
    if (pubProductMatch) {
      try {
        const codeOrId = pubProductMatch[1];
        const row = await env.DB.prepare(
          'SELECT id, code, name, price, primaryCategory, categories, images, description, stemsNote, isVisible, isFeatured, sortOrder, version, updatedAt FROM products WHERE (code = ? COLLATE NOCASE OR id = ?) AND isVisible = 1'
        ).bind(codeOrId, codeOrId).first();

        if (!row) {
          return json({ error: 'Không tìm thấy mẫu hoa.' }, 404);
        }
        return json(productFromRow(row));
      } catch (error) {
        console.error(error);
        return json({ error: 'Không tải được thông tin mẫu hoa.' }, 500);
      }
    }

    return new Response(null, { status: 404, headers: SECURITY_HEADERS });
  },
};
