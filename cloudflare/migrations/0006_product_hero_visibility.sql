ALTER TABLE products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1));

-- Preserve the products previously selected by featured-products.json as the initial admin setting.
UPDATE products SET featured = 1 WHERE id IN ('mb-27', 'mb-28', 'mb-09');

