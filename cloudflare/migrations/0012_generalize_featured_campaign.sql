UPDATE commerce_settings
SET value = '{"enabled":true,"headline":"Featured collection","description":"Discover our current featured products.","largeDescription":"Explore a curated collection of featured prints and products.","accentColor":"#ffd07a","animationStyle":"arrow"}',
    updated_at = CURRENT_TIMESTAMP
WHERE key = 'fifa_campaign_config'
  AND json_extract(value, '$.headline') = 'FIFA World Cup 2026';
