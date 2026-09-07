INSERT INTO commerce_settings (key, value)
VALUES (
  'fifa_campaign_config',
  '{"enabled":true,"headline":"Featured collection","description":"Discover our current featured products.","largeDescription":"Explore a curated collection of featured prints and products.","accentColor":"#ffd07a","animationStyle":"arrow"}'
)
ON CONFLICT(key) DO NOTHING;
