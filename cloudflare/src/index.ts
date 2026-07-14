import products from '../../public/products.json';

type Product = { id: string; name: string; price: number };
type CartRequestItem = { productId?: string; quantity?: number };
type D1Statement = { bind: (...values: unknown[]) => D1Statement; run: () => Promise<unknown> };
type D1Database = { prepare: (query: string) => D1Statement; batch: (statements: D1Statement[]) => Promise<unknown> };

type Env = {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  ALLOWED_ORIGINS: string;
  PICKUP_PINCODE: string;
  DB?: D1Database;
};

type PaymentResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  internalOrderId?: string;
};

type CustomerDetails = { name?: string; email?: string; phone?: string };
type AddressDetails = {
  line1?: string; line2?: string; landmark?: string; city?: string;
  state?: string; pincode?: string; country?: string;
};

const encoder = new TextEncoder();
const FREE_SHIPPING_THRESHOLD_PAISE = 49900;
const STANDARD_SHIPPING_PAISE = 7000;

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function isAllowedOrigin(origin: string, env: Env) {
  return env.ALLOWED_ORIGINS.split(',').map(value => value.trim()).includes(origin);
}

function razorpayAuthorization(env: Env) {
  return `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
}

function validCustomer(customer: CustomerDetails | undefined) {
  return Boolean(customer?.name?.trim() && customer.name.trim().length <= 100 &&
    customer?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) && customer.email.length <= 254 &&
    customer?.phone && /^[0-9+ -]{10,15}$/.test(customer.phone));
}

function validAddress(address: AddressDetails | undefined) {
  return Boolean(address?.line1?.trim() && address.line1.trim().length <= 200 &&
    address?.city?.trim() && address.city.trim().length <= 100 &&
    address?.state?.trim() && address.state.trim().length <= 100 &&
    address?.pincode && /^[1-9][0-9]{5}$/.test(address.pincode) && address.country === 'IN' &&
    (!address.line2 || address.line2.length <= 200) && (!address.landmark || address.landmark.length <= 150));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function createOrder(request: Request, env: Env, origin: string, persistOrder = false) {
  const body = await request.json() as {
    productId?: string; items?: CartRequestItem[];
    customer?: CustomerDetails; address?: AddressDetails;
  };
  if (persistOrder && (!validCustomer(body.customer) || !validAddress(body.address))) {
    return json({ error: 'Valid customer and delivery details are required.' }, 400, origin);
  }
  if (persistOrder && !env.DB) {
    return json({ error: 'Order database is not configured yet.' }, 503, origin);
  }
  const requestedItems = Array.isArray(body.items)
    ? body.items
    : body.productId
      ? [{ productId: body.productId, quantity: 1 }]
      : [];

  if (requestedItems.length === 0 || requestedItems.length > 50) {
    return json({ error: 'Cart is empty or too large.' }, 400, origin);
  }

  const catalogue = products as Product[];
  const normalizedItems = requestedItems.map(item => {
    const quantity = Number.isInteger(item.quantity) ? Number(item.quantity) : 0;
    const product = catalogue.find(candidate => candidate.id === item.productId);
    return { product, quantity };
  });

  if (normalizedItems.some(item => !item.product || item.quantity < 1 || item.quantity > 20)) {
    return json({ error: 'One or more cart items are invalid.' }, 400, origin);
  }

  const duplicateIds = normalizedItems.map(item => item.product!.id);
  if (new Set(duplicateIds).size !== duplicateIds.length) {
    return json({ error: 'Duplicate cart items are not allowed.' }, 400, origin);
  }

  const pricedItems = normalizedItems.map(({ product, quantity }) => ({
    productId: product!.id,
    name: product!.name,
    quantity,
    unitPrice: Math.round(product!.price * 100),
    lineTotal: Math.round(product!.price * 100) * quantity,
  }));
  if (pricedItems.some(item => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)) {
    return json({ error: 'One or more products cannot be purchased.' }, 400, origin);
  }

  const subtotal = pricedItems.reduce((total, item) => total + item.lineTotal, 0);
  const shipping = persistOrder && subtotal <= FREE_SHIPPING_THRESHOLD_PAISE
    ? STANDARD_SHIPPING_PAISE
    : 0;
  const amount = subtotal + shipping;
  const receipt = `mb_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`.slice(0, 40);
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': razorpayAuthorization(env),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        item_count: String(pricedItems.reduce((total, item) => total + item.quantity, 0)),
        product_ids: pricedItems.map(item => item.productId).join(',').slice(0, 256),
        shipping_paise: String(shipping),
      },
    }),
  });
  const order = await response.json() as { id?: string; amount?: number; currency?: string; error?: { description?: string } };

  if (!response.ok || !order.id) {
    console.error('Razorpay order creation failed', response.status, order.error?.description);
    return json({ error: 'Could not create the payment order.' }, 502, origin);
  }

  let internalOrderId: string | undefined;
  let trackingToken: string | undefined;
  if (persistOrder && env.DB) {
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    internalOrderId = `MB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`;
    trackingToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const trackingTokenHash = await sha256Hex(trackingToken);
    const customer = body.customer!;
    const address = body.address!;
    const statements = [
      env.DB.prepare(`
        INSERT INTO orders (
          id, tracking_token_hash, razorpay_order_id, customer_name, customer_email,
          customer_phone, address_json, subtotal_paise, shipping_paise, discount_paise,
          total_paise, payment_status, fulfillment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', 'pending')
      `).bind(
        internalOrderId, trackingTokenHash, order.id, customer.name!.trim(),
        customer.email!.trim().toLowerCase(), customer.phone!.trim(), JSON.stringify(address), subtotal, shipping, amount,
      ),
      ...pricedItems.map(item => env.DB!.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity)
        VALUES (?, ?, ?, ?, ?)
      `).bind(internalOrderId, item.productId, item.name, item.unitPrice, item.quantity)),
      env.DB.prepare(`
        INSERT INTO order_events (order_id, event_type, message)
        VALUES (?, 'order.created', 'Order created and awaiting payment')
      `).bind(internalOrderId),
    ];

    try {
      await env.DB.batch(statements);
    } catch (error) {
      console.error('D1 order creation failed', error);
      return json({ error: 'Could not save your order. No payment has been taken.' }, 500, origin);
    }
  }

  return json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: env.RAZORPAY_KEY_ID,
    items: pricedItems,
    subtotal,
    shipping,
    internalOrderId,
    trackingToken,
  }, 200, origin);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyPayment(request: Request, env: Env, origin: string) {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, internalOrderId } = await request.json() as PaymentResponse;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return json({ error: 'Incomplete payment response.' }, 400, origin);
  }

  const expectedSignature = await hmacHex(
    `${razorpay_order_id}|${razorpay_payment_id}`,
    env.RAZORPAY_KEY_SECRET,
  );
  if (!constantTimeEqual(expectedSignature, razorpay_signature)) {
    return json({ verified: false, error: 'Payment signature is invalid.' }, 400, origin);
  }

  const authorization = razorpayAuthorization(env);
  const [paymentResponse, orderResponse] = await Promise.all([
    fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
      headers: { Authorization: authorization },
    }),
    fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`, {
      headers: { Authorization: authorization },
    }),
  ]);
  const payment = await paymentResponse.json() as { order_id?: string; status?: string };
  const order = await orderResponse.json() as { id?: string; status?: string };
  const recordsMatch = paymentResponse.ok && orderResponse.ok &&
    payment.order_id === razorpay_order_id && order.id === razorpay_order_id &&
    ['authorized', 'captured'].includes(payment.status || '');

  if (!recordsMatch) {
    return json({ verified: false, error: 'Payment status could not be confirmed. Please contact us before retrying.' }, 409, origin);
  }

  const captured = payment.status === 'captured' && order.status === 'paid';
  if (internalOrderId && env.DB) {
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE orders SET razorpay_payment_id = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND razorpay_order_id = ?
      `).bind(razorpay_payment_id, captured ? 'paid' : 'authorized', internalOrderId, razorpay_order_id),
      env.DB.prepare(`
        INSERT OR REPLACE INTO payments (id, order_id, razorpay_order_id, status, amount_paise, updated_at)
        SELECT ?, id, razorpay_order_id, ?, total_paise, CURRENT_TIMESTAMP
        FROM orders WHERE id = ? AND razorpay_order_id = ?
      `).bind(razorpay_payment_id, captured ? 'captured' : 'authorized', internalOrderId, razorpay_order_id),
      env.DB.prepare(`
        INSERT INTO order_events (order_id, event_type, message)
        SELECT id, ?, ? FROM orders WHERE id = ? AND razorpay_order_id = ?
      `).bind(
        captured ? 'payment.captured' : 'payment.authorized',
        captured ? 'Payment captured' : 'Payment authorized and awaiting capture',
        internalOrderId,
        razorpay_order_id,
      ),
    ]);
  }
  return json({ verified: true, captured, paymentId: razorpay_payment_id }, 200, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin, env)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

    try {
      const path = new URL(request.url).pathname.replace(/\/$/, '');
      if (path === '/create-order') return await createOrder(request, env, origin);
      if (path === '/checkout/order') return await createOrder(request, env, origin, true);
      if (path === '/verify-payment') return await verifyPayment(request, env, origin);
      return json({ error: 'Not found.' }, 404, origin);
    } catch (error) {
      console.error('Razorpay Worker error', error);
      return json({ error: 'Invalid request.' }, 400, origin);
    }
  },
};
