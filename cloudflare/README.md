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

Use Razorpay test keys until the full checkout flow is verified. Before switching to live keys, enable automatic capture in Razorpay and configure the recommended payment webhooks.
