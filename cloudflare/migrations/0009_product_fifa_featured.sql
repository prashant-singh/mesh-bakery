ALTER TABLE products ADD COLUMN fifa_featured INTEGER NOT NULL DEFAULT 0 CHECK (fifa_featured IN (0, 1));

-- Preserve the products currently shown in the FIFA collection while allowing
-- hero visibility and FIFA collection membership to be managed independently.
UPDATE products SET fifa_featured = featured;
