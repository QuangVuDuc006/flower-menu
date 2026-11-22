CREATE TABLE products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  primaryCategory TEXT NOT NULL,
  categories TEXT NOT NULL CHECK (json_valid(categories)),
  images TEXT NOT NULL CHECK (json_valid(images)),
  description TEXT NOT NULL DEFAULT '',
  stemsNote TEXT,
  isVisible INTEGER NOT NULL DEFAULT 1 CHECK (isVisible IN (0, 1)),
  updatedAt TEXT NOT NULL
);
