import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../cloudflare/migrations/0008_database_catalogue.sql', import.meta.url), 'utf8');
const products = [...migration.matchAll(/, '((?:''|[^'])*)'\)\r?\nON CONFLICT/g)].map(match => {
  const product = JSON.parse(match[1].replaceAll("''", "'"));
  delete product.size;
  return product;
});
if (products.length !== 31) throw new Error(`Expected 31 seeded products, found ${products.length}`);
fs.writeFileSync(new URL('../public/products.json', import.meta.url), `${JSON.stringify(products, null, 2)}\n`);
console.log(`restored ${products.length} products to public/products.json`);
