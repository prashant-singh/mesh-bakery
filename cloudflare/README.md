# Mesh Bakery payment Worker

This Worker securely creates Razorpay orders and verifies completed checkout responses for the static GitHub Pages storefront.

## First deployment

From the repository root:

1. Authenticate: `npx wrangler login`
2. Deploy the initial Worker: `npx wrangler deploy --config cloudflare/wrangler.jsonc`
3. Copy the resulting `https://mesh-bakery-payments.<account>.workers.dev` URL.
4. Add the Razorpay test Key ID: `npx wrangler secret put RAZORPAY_KEY_ID --config cloudflare/wrangler.jsonc`
5. Add the matching test Key Secret: `npx wrangler secret put RAZORPAY_KEY_SECRET --config cloudflare/wrangler.jsonc`
6. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and create `RAZORPAY_API_URL` with that URL (no trailing slash).
7. Re-run the GitHub Pages workflow or push a commit so the frontend is rebuilt with the Worker URL.

The configured production origin is `https://prashant-singh.github.io`. If the storefront uses a custom domain, replace that value in `wrangler.jsonc` and deploy again.

The configured Delhivery pickup-origin pincode is `380009`. Update `PICKUP_PINCODE` in `wrangler.jsonc` if the dispatch location changes.

Shipping is calculated server-side: standard shipping is ₹70 for cart subtotals up to and including ₹499, and delivery is free above ₹499.

Use Razorpay test keys until the full checkout flow is verified. Before switching to live keys, enable automatic capture in Razorpay and configure the recommended payment webhooks.

## Commerce database

The initial cart, inventory, orders, payments, shipments, and webhook schema is in `migrations/0001_commerce.sql`.

Create and initialize the production D1 database:

1. `npx wrangler d1 create mesh-bakery-commerce --config cloudflare/wrangler.jsonc`
2. Copy the returned `d1_databases` block into `cloudflare/wrangler.jsonc` with the binding name `DB`.
3. `npx wrangler d1 migrations apply mesh-bakery-commerce --remote --config cloudflare/wrangler.jsonc`
4. Redeploy the Worker.

Do not apply the migration until the returned database ID has been added to the Wrangler configuration. Product stock still needs to be seeded before inventory enforcement is enabled.

The storefront cart is stored in the customer's browser and now leads to a guest checkout page. The checkout collects contact and delivery details, saves an internal order in D1, and opens Razorpay for the server-calculated full-cart amount.

Until the D1 binding is configured, checkout returns `Order database is not configured yet.` Delhivery serviceability, shipping rates, inventory reservation, webhooks, and customer tracking remain the next production-safety milestones.
