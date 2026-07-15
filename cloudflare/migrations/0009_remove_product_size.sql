UPDATE products
SET product_json = json_remove(product_json, '$.size'), updated_at = CURRENT_TIMESTAMP
WHERE product_json IS NOT NULL;

