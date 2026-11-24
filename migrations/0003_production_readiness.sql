ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN idempotencyKey TEXT;
ALTER TABLE products ADD COLUMN imageHash TEXT;
ALTER TABLE products ADD COLUMN isFeatured INTEGER NOT NULL DEFAULT 0 CHECK (isFeatured IN (0, 1));
ALTER TABLE products ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_idempotency
  ON products(idempotencyKey)
  WHERE idempotencyKey IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_public_list
  ON products(isVisible, isFeatured DESC, sortOrder ASC, code ASC);

CREATE INDEX IF NOT EXISTS idx_categories_order
  ON categories(isActive, sortOrder ASC, name ASC);

INSERT OR IGNORE INTO categories (id, name, slug, sortOrder, isActive, createdAt, updatedAt)
VALUES
  ('cat-hoa-bo', 'Hoa bó', 'hoa-bo', 1, 1, '2026-11-22T00:00:00.000Z', '2026-11-22T00:00:00.000Z'),
  ('cat-hoa-gio', 'Hoa giỏ', 'hoa-gio', 2, 1, '2026-11-22T00:00:00.000Z', '2026-11-22T00:00:00.000Z'),
  ('cat-hoa-sinh-nhat', 'Hoa sinh nhật', 'hoa-sinh-nhat', 3, 1, '2026-11-22T00:00:00.000Z', '2026-11-22T00:00:00.000Z'),
  ('cat-hoa-chuc-mung', 'Hoa chúc mừng', 'hoa-chuc-mung', 4, 1, '2026-11-22T00:00:00.000Z', '2026-11-22T00:00:00.000Z'),
  ('cat-hoa-theo-yeu-cau', 'Hoa theo yêu cầu', 'hoa-theo-yeu-cau', 5, 1, '2026-11-22T00:00:00.000Z', '2026-11-22T00:00:00.000Z');

INSERT OR IGNORE INTO categories (id, name, slug, sortOrder, isActive, createdAt, updatedAt)
SELECT
  'cat-' || lower(hex(randomblob(8))),
  trim(val),
  'cat-' || lower(hex(randomblob(8))),
  100,
  1,
  datetime('now'),
  datetime('now')
FROM (
  SELECT primaryCategory AS val FROM products WHERE trim(primaryCategory) != ''
  UNION
  SELECT CAST(je.value AS TEXT) AS val
  FROM products, json_each(products.categories) AS je
  WHERE trim(CAST(je.value AS TEXT)) != ''
);
