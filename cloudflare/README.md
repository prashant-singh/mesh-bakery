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

## Admin dashboard

The storefront exposes an admin sign-in page at `/admin`. Order and customer data is returned only after the Worker validates an eight-hour signed admin session. Login attempts are limited to five failures per IP within fifteen minutes.

Configure admin access from the repository root:

1. Apply the admin security migration: `npx wrangler d1 migrations apply mesh-bakery-commerce --remote --config cloudflare/wrangler.jsonc`
2. Set a long, unique admin password: `npx wrangler secret put ADMIN_PASSWORD --config cloudflare/wrangler.jsonc`
3. Set a separate random session-signing secret of at least 32 characters: `npx wrangler secret put ADMIN_SESSION_SECRET --config cloudflare/wrangler.jsonc`
4. Redeploy: `npx wrangler deploy --config cloudflare/wrangler.jsonc`
5. Rebuild the GitHub Pages site, then visit `/mesh-bakery/admin` (or `/admin` when using a custom domain).

Never add either admin value to `wrangler.jsonc`, `.env.local`, GitHub variables, or frontend code. Both values must remain encrypted Worker secrets.

## Production operations

Apply the operations migration before deploying this version:

`npx wrangler d1 migrations apply mesh-bakery-commerce --remote --config cloudflare/wrangler.jsonc`

### Razorpay webhooks

1. Create a strong webhook secret and save it with `npx wrangler secret put RAZORPAY_WEBHOOK_SECRET --config cloudflare/wrangler.jsonc`.
2. In the Razorpay Dashboard (Test Mode first), add `https://mesh-bakery-payments.<account>.workers.dev/webhooks/razorpay` as a webhook.
3. Enter the exact same webhook secret and enable `payment.captured` and `order.paid`.
4. Repeat the webhook configuration in Live Mode when switching to live API keys.

The handler validates the raw-body signature, rejects unsigned requests, and deduplicates webhook event IDs.

### Inventory

Open `/admin`, select **sync catalogue**, enter stock quantities, and save each product. Only enable enforcement after all sellable products have correct stock. Enforcement is disabled by default. Captured payments decrement inventory once, whether confirmation arrives through Checkout verification or a webhook.

### Delhivery

Configure the Delhivery API token:

1. `npx wrangler secret put DELHIVERY_API_TOKEN --config cloudflare/wrangler.jsonc`

Checkout verifies prepaid pincode serviceability through Delhivery before creating the Razorpay order. Create shipments manually in Delhivery One, then use **add delhivery awb** on the paid order in the admin dashboard. Customer tracking automatically refreshes the AWB status from Delhivery when its cached status is older than ten minutes. Admins can also use **refresh shipment**.

`DELHIVERY_API_BASE_URL` defaults to the production URL in `wrangler.jsonc`. For staging-token testing, change it to `https://staging-express.delhivery.com`; staging and production tokens cannot be mixed.

### Customer tracking

After payment, checkout links to `/track` with the order reference. Customers can also enter that reference manually. Tracking responses exclude customer contact, address, and customization details, and lookups are rate-limited per IP.

### Order confirmation email

Confirmation email is sent through Resend only after a payment is captured. It contains the order reference, products, quantities, customer-entered customization details, subtotal, shipping, total, and tracking link. The database records `pending`, `sending`, `sent`, or `failed` to prevent duplicate delivery from the Checkout callback and Razorpay webhook.

1. Create a Resend account and verify a sending domain or subdomain.
2. Create a Resend API key and save it with `npx wrangler secret put RESEND_API_KEY --config cloudflare/wrangler.jsonc`.
3. Save a sender using the verified domain, for example `Mesh Bakery <orders@updates.example.com>`, with `npx wrangler secret put ORDER_EMAIL_FROM --config cloudflare/wrangler.jsonc`.
4. Apply `0004_order_email.sql` remotely and redeploy the Worker.

Resend's unverified test sender can only send to the Resend account owner's address. A verified domain is required before sending confirmation emails to customers.
