type Product = {
  id: string;
  name: string;
  price: number;
  category?: string;
  media?: Array<{ type: 'image' | 'video'; url: string; thumbUrl?: string; cardUrl?: string; detailUrl?: string; posterUrl?: string }>;
  tags?: unknown[];
  shortDescription?: string;
  description?: string;
  active?: boolean;
  featured?: boolean;
  fifa_featured?: boolean;
  customizableProperties?: CustomizationField[];
};
type CustomizationField = { key: string; label: string; type?: string; required?: boolean; placeholder?: string; helpText?: string; options?: string[] };
type FifaCampaignConfig = { enabled: boolean; headline: string; description: string; largeDescription?: string; accentColor?: string; animationStyle: 'none' | 'shimmer' | 'arrow' | 'pulse' };
type CartRequestItem = { productId?: string; quantity?: number; customization?: Record<string, string> };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  run: () => Promise<{ meta?: { changes?: number } }>;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<{ results: T[] }>;
};
type D1Database = { prepare: (query: string) => D1Statement; batch: (statements: D1Statement[]) => Promise<unknown> };

type Env = {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  ALLOWED_ORIGINS: string;
  PICKUP_PINCODE: string;
  ADMIN_PASSWORD: string;
  ADMIN_SESSION_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  DELHIVERY_API_TOKEN?: string;
  DELHIVERY_PICKUP_NAME?: string;
  DELHIVERY_API_BASE_URL?: string;
  RESEND_API_KEY?: string;
  ORDER_EMAIL_FROM?: string;
  PUBLIC_STOREFRONT_URL?: string;
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    customer?.phone && validIndianMobile(customer.phone));
}

function validIndianMobile(value: string) {
  const normalized = value.replace(/[\s-]/g, '');
  return /^(?:\+91|91|0)?[6-9][0-9]{9}$/.test(normalized);
}

function validAddress(address: AddressDetails | undefined) {
  return Boolean(address?.line1?.trim() && address.line1.trim().length <= 200 &&
    address?.city?.trim() && address.city.trim().length <= 100 &&
    address?.state?.trim() && address.state.trim().length <= 100 &&
    address?.pincode && /^[1-9][0-9]{5}$/.test(address.pincode) && address.country === 'IN' &&
    (!address.line2 || address.line2.length <= 200) && (!address.landmark || address.landmark.length <= 150));
}

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sessionSignature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

async function createAdminToken(env: Env) {
  const payload = base64Url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 }));
  return `${payload}.${await sessionSignature(payload, env.ADMIN_SESSION_SECRET)}`;
}

async function validAdminToken(request: Request, env: Env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !env.ADMIN_SESSION_SECRET) return false;
  const expected = await sessionSignature(payload, env.ADMIN_SESSION_SECRET);
  if (!constantTimeEqual(expected, signature)) return false;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as { exp?: number };
    return typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function normalizedCustomization(customization: Record<string, string> | undefined) {
  if (!customization) return {};
  const entries = Object.entries(customization)
    .filter(([key, value]) => key.length <= 80 && typeof value === 'string' && value.trim())
    .map(([key, value]) => [key, value.trim().slice(0, 300)] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  if (entries.length > 20 || entries.length !== Object.values(customization).filter(value => typeof value === 'string' && value.trim()).length) {
    throw new Error('Invalid customization details.');
  }
  return Object.fromEntries(entries);
}

function parseCustomizationFields(value: unknown): CustomizationField[] {
  let input: unknown = value;
  if (typeof value === 'string') {
    try { input = JSON.parse(value); } catch { throw new Error('Invalid customization fields.'); }
  }
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > 20) throw new Error('Invalid customization fields.');
  const keys = new Set<string>();
  return input.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid customization field.');
    const field = raw as Record<string, unknown>;
    const key = String(field.key || '').trim();
    const label = String(field.label || '').trim();
    const type = String(field.type || 'text');
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(key) || !label || label.length > 80 || keys.has(key)) throw new Error(`Invalid customization field ${index + 1}.`);
    if (!['text', 'number', 'textarea', 'select', 'color'].includes(type)) throw new Error(`Invalid field type for ${label}.`);
    keys.add(key);
    const options = Array.isArray(field.options) ? field.options.map(option => String(option).trim()).filter(Boolean) : [];
    if (options.length > 30 || options.some(option => option.length > 50) || ((type === 'select' || type === 'color') && !options.length)) throw new Error(`${label} needs valid options.`);
    return { key, label, type, required: field.required === true, placeholder: String(field.placeholder || '').slice(0, 120), helpText: String(field.helpText || '').slice(0, 200), ...(options.length ? { options } : {}) };
  });
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
  if (persistOrder && body.customer?.phone && !validIndianMobile(body.customer.phone)) {
    return json({ error: 'Enter a valid Indian mobile number.' }, 400, origin);
  }
  if (persistOrder && (!validCustomer(body.customer) || !validAddress(body.address))) {
    return json({ error: 'Valid customer and delivery details are required.' }, 400, origin);
  }
  if (!env.DB) {
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

  const normalizedItems = await Promise.all(requestedItems.map(async item => {
    const quantity = Number.isInteger(item.quantity) ? Number(item.quantity) : 0;
    const row = await env.DB!.prepare('SELECT name, price_paise, product_json, customization_json FROM products WHERE id = ? AND active = 1').bind(item.productId).first<{ name: string; price_paise: number; product_json: string | null; customization_json: string | null }>();
    let product: Product | undefined;
    if (row) {
      try { product = { ...(JSON.parse(row.product_json || '{}') as Product), id: String(item.productId), name: row.name, price: row.price_paise / 100, customizableProperties: row.customization_json == null ? [] : parseCustomizationFields(row.customization_json) }; } catch { product = undefined; }
    }
    return { product, quantity, customization: normalizedCustomization(item.customization) };
  }));

  if (normalizedItems.some(item => !item.product || item.quantity < 1 || item.quantity > 20)) {
    return json({ error: 'One or more cart items are invalid.' }, 400, origin);
  }
  if (persistOrder) {
    if (!env.DELHIVERY_API_TOKEN) return json({ error: 'Delivery serviceability is not configured.' }, 503, origin);
    const baseUrl = (env.DELHIVERY_API_BASE_URL || 'https://track.delhivery.com').replace(/\/$/, '');
    const serviceabilityResponse = await fetch(`${baseUrl}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(body.address!.pincode!)}`, {
      headers: { Authorization: `Token ${env.DELHIVERY_API_TOKEN}` },
    });
    const serviceability = await serviceabilityResponse.json() as { delivery_codes?: Array<{ postal_code?: { pre_paid?: string; remarks?: string } }> };
    const postalCode = serviceability.delivery_codes?.[0]?.postal_code;
    if (!serviceabilityResponse.ok) return json({ error: 'Could not verify delivery serviceability. Please try again.' }, 502, origin);
    if (!postalCode || postalCode.pre_paid !== 'Y' || Boolean(postalCode.remarks?.trim())) {
      return json({ error: 'Delhivery prepaid delivery is currently unavailable for this pincode.' }, 409, origin);
    }
  }

  const missingRequiredCustomization = normalizedItems.some(item =>
    item.product!.customizableProperties?.some(field => field.required && !item.customization[field.key]?.trim()),
  );
  if (missingRequiredCustomization) {
    return json({ error: 'Complete all required customization fields.' }, 400, origin);
  }

  const uniqueLines = normalizedItems.map(item => `${item.product!.id}:${JSON.stringify(item.customization)}`);
  if (new Set(uniqueLines).size !== uniqueLines.length) {
    return json({ error: 'Duplicate cart items are not allowed.' }, 400, origin);
  }

  const pricedItems = normalizedItems.map(({ product, quantity, customization }) => ({
    productId: product!.id,
    name: product!.name,
    quantity,
    unitPrice: Math.round(product!.price * 100),
    lineTotal: Math.round(product!.price * 100) * quantity,
    customization,
  }));
  if (pricedItems.some(item => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)) {
    return json({ error: 'One or more products cannot be purchased.' }, 400, origin);
  }

  if (persistOrder && env.DB) {
    for (const item of pricedItems) {
      const availability = await env.DB.prepare('SELECT active FROM products WHERE id = ?').bind(item.productId).first<{ active: number }>();
      if (availability && !availability.active) return json({ error: `${item.name} is no longer available.` }, 409, origin);
    }
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
        INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity, customization_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(internalOrderId, item.productId, item.name, item.unitPrice, item.quantity, JSON.stringify(item.customization))),
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

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character] || character);
}

async function sendOrderConfirmation(env: Env, orderId: string) {
  if (!env.DB || !env.RESEND_API_KEY || !env.ORDER_EMAIL_FROM || !env.PUBLIC_STOREFRONT_URL) return;
  const claim = await env.DB.prepare(`UPDATE orders SET confirmation_email_status = 'sending', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND payment_status = 'paid' AND confirmation_email_status IN ('pending', 'failed')`).bind(orderId).run();
  if ((claim.meta?.changes || 0) === 0) return;
  try {
    const order = await env.DB.prepare(`SELECT id, customer_name, customer_email, customer_phone, address_json, subtotal_paise, shipping_paise, total_paise
      FROM orders WHERE id = ?`).bind(orderId).first<{
        id: string; customer_name: string; customer_email: string; customer_phone: string; address_json: string;
        subtotal_paise: number; shipping_paise: number; total_paise: number;
      }>();
    if (!order?.customer_email) throw new Error('Order does not have a customer email address.');
    const items = await env.DB.prepare(`SELECT product_name, unit_price_paise, quantity, customization_json
      FROM order_items WHERE order_id = ? ORDER BY id`).bind(orderId).all<{
        product_name: string; unit_price_paise: number; quantity: number; customization_json: string;
      }>();
    const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
    const itemHtml = items.results.map(item => {
      let customization: Record<string, string> = {};
      try { customization = JSON.parse(item.customization_json || '{}') as Record<string, string>; } catch { customization = {}; }
      const details = Object.entries(customization).map(([key, value]) =>
        `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`,
      ).join('');
      return `<div style="padding:16px 0;border-bottom:1px solid #e9e4db"><strong>${escapeHtml(item.quantity)} × ${escapeHtml(item.product_name)}</strong><span style="float:right">${escapeHtml(money(item.unit_price_paise * item.quantity))}</span>${details ? `<ul style="margin:8px 0 0;padding-left:20px;color:#5f5a53">${details}</ul>` : ''}</div>`;
    }).join('');
    const trackingUrl = `${env.PUBLIC_STOREFRONT_URL.replace(/\/$/, '')}/track?order=${encodeURIComponent(order.id)}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#2d2a26"><h1>Thank you for your order</h1><p>Hi ${escapeHtml(order.customer_name)}, your payment has been confirmed.</p><p><strong>Order reference:</strong> ${escapeHtml(order.id)}</p><div>${itemHtml}</div><div style="padding:16px 0"><p>Subtotal: ${escapeHtml(money(order.subtotal_paise))}</p><p>Shipping: ${escapeHtml(money(order.shipping_paise))}</p><p style="font-size:20px"><strong>Total: ${escapeHtml(money(order.total_paise))}</strong></p></div><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:12px 20px;border-radius:24px;background:#ff6b35;color:white;text-decoration:none;font-weight:bold">Track your order</a><p style="margin-top:28px;color:#777;font-size:12px">Keep your order reference safe. It is required to view tracking.</p></div>`;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `mesh-order-${order.id}` },
      body: JSON.stringify({ from: env.ORDER_EMAIL_FROM, to: [order.customer_email], subject: `Mesh Bakery order confirmed — ${order.id}`, html }),
    });
    if (!response.ok) throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
    let address: Record<string, string> = {};
    try { address = JSON.parse(order.address_json || '{}') as Record<string, string>; } catch { address = {}; }
    const addressText = [address.line1, address.line2, address.landmark, address.city, address.state, address.pincode, address.country].filter(Boolean).join(', ');
    const internalHtml = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#2d2a26"><h1>New paid order received</h1><p><strong>Order reference:</strong> ${escapeHtml(order.id)}</p><h2>Customer</h2><p>${escapeHtml(order.customer_name)}<br>${escapeHtml(order.customer_email)}<br>${escapeHtml(order.customer_phone)}</p><h2>Delivery address</h2><p>${escapeHtml(addressText)}</p><h2>Items and customization</h2><div>${itemHtml}</div><div style="padding:16px 0"><p>Subtotal: ${escapeHtml(money(order.subtotal_paise))}</p><p>Shipping collected: ${escapeHtml(money(order.shipping_paise))}</p><p style="font-size:20px"><strong>Order total: ${escapeHtml(money(order.total_paise))}</strong></p></div><p><a href="${escapeHtml(trackingUrl)}">Open customer tracking</a></p></div>`;
    const internalResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `mesh-internal-order-${order.id}` },
      body: JSON.stringify({
        from: env.ORDER_EMAIL_FROM,
        to: ['prashant19194@gmail.com', 'harshitdubeyhd@gmail.com'],
        subject: `New Mesh Bakery order — ${order.id}`,
        html: internalHtml,
      }),
    });
    if (!internalResponse.ok) throw new Error(`Internal order email failed with ${internalResponse.status}: ${await internalResponse.text()}`);
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET confirmation_email_status = 'sent', confirmation_email_sent_at = CURRENT_TIMESTAMP, fulfillment_status = CASE WHEN fulfillment_status = 'pending' THEN 'confirmed' ELSE fulfillment_status END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderId),
      env.DB.prepare("INSERT INTO order_events (order_id, event_type, message) VALUES (?, 'order.confirmed', 'Order confirmed and confirmation email sent')").bind(orderId),
    ]);
  } catch (error) {
    console.error('Order confirmation email failed', error);
    await env.DB.prepare("UPDATE orders SET confirmation_email_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderId).run();
  }
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
    const statements: D1Statement[] = [];
    const existing = await env.DB.prepare('SELECT payment_status FROM orders WHERE id = ? AND razorpay_order_id = ?').bind(internalOrderId, razorpay_order_id).first<{ payment_status: string }>();
    if (captured && existing?.payment_status !== 'paid') {
      const setting = await env.DB.prepare("SELECT value FROM commerce_settings WHERE key = 'inventory_enabled'").first<{ value: string }>();
      if (setting?.value === 'true') {
        const quantities = await env.DB.prepare('SELECT product_id, SUM(quantity) AS quantity FROM order_items WHERE order_id = ? GROUP BY product_id').bind(internalOrderId).all<{ product_id: string; quantity: number }>();
        for (const item of quantities.results) statements.push(env.DB.prepare('UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(item.quantity, item.product_id));
      }
    }
    statements.push(
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
    );
    await env.DB.batch(statements);
    if (captured) await sendOrderConfirmation(env, internalOrderId);
  }
  return json({ verified: true, captured, paymentId: razorpay_payment_id }, 200, origin);
}

async function adminLogin(request: Request, env: Env, origin: string) {
  if (!env.DB || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return json({ error: 'Admin access is not configured.' }, 503, origin);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Hex(`${ip}:${env.ADMIN_SESSION_SECRET}`);
  const now = Math.floor(Date.now() / 1000);
  const attempt = await env.DB.prepare(
    'SELECT failed_count, window_started_at, blocked_until FROM admin_login_attempts WHERE ip_hash = ?',
  ).bind(ipHash).first<{ failed_count: number; window_started_at: number; blocked_until: number }>();
  if (attempt && attempt.blocked_until > now) {
    return json({ error: 'Too many login attempts. Try again later.' }, 429, origin);
  }

  const body = await request.json() as { password?: string };
  const password = typeof body.password === 'string' ? body.password : '';
  const passwordMatches = password.length === env.ADMIN_PASSWORD.length &&
    constantTimeEqual(password, env.ADMIN_PASSWORD);
  if (!passwordMatches) {
    const insideWindow = Boolean(attempt && now - attempt.window_started_at < 15 * 60);
    const failedCount = insideWindow ? (attempt?.failed_count || 0) + 1 : 1;
    const blockedUntil = failedCount >= 5 ? now + 15 * 60 : 0;
    await env.DB.prepare(`
      INSERT INTO admin_login_attempts (ip_hash, failed_count, window_started_at, blocked_until)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(ip_hash) DO UPDATE SET
        failed_count = excluded.failed_count,
        window_started_at = excluded.window_started_at,
        blocked_until = excluded.blocked_until
    `).bind(ipHash, failedCount, insideWindow ? attempt!.window_started_at : now, blockedUntil).run();
    return json({ error: 'Incorrect password.' }, 401, origin);
  }

  await env.DB.prepare('DELETE FROM admin_login_attempts WHERE ip_hash = ?').bind(ipHash).run();
  return json({ token: await createAdminToken(env), expiresIn: 60 * 60 * 8 }, 200, origin);
}

async function listAdminOrders(request: Request, env: Env, origin: string) {
  if (!env.DB) return json({ error: 'Order database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);

  const url = new URL(request.url);
  const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
  const pageSize = Math.min(50, Math.max(5, Math.floor(Number(url.searchParams.get('pageSize')) || 15)));
  const offset = (page - 1) * pageSize;
  const totalRow = await env.DB.prepare('SELECT COUNT(*) AS total FROM orders').first<{ total: number }>();
  const orders = await env.DB.prepare(`
    SELECT o.*, s.awb, s.status AS shipment_status, s.tracking_url
    FROM orders o
    LEFT JOIN shipments s ON s.order_id = o.id
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all<Record<string, unknown>>();
  const items = await env.DB.prepare(`
    SELECT oi.* FROM order_items oi
    INNER JOIN (SELECT id FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?) recent ON recent.id = oi.order_id
    ORDER BY oi.id ASC
  `).bind(pageSize, offset).all<Record<string, unknown>>();
  return json({ orders: orders.results, items: items.results, pagination: { page, pageSize, total: totalRow?.total || 0, totalPages: Math.max(1, Math.ceil((totalRow?.total || 0) / pageSize)) } }, 200, origin);
}

async function adminDashboard(request: Request, env: Env, origin: string) {
  if (!env.DB) return json({ error: 'Order database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const summary = await env.DB.prepare(`
    SELECT
      COUNT(*) AS total_orders,
      SUM(CASE WHEN fulfillment_status != 'delivered' THEN 1 ELSE 0 END) AS active_orders,
      SUM(CASE WHEN fulfillment_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
      SUM(total_paise) AS total_money_paise,
      SUM(CASE WHEN fulfillment_status != 'delivered' THEN total_paise ELSE 0 END) AS pending_money_paise,
      SUM(CASE WHEN fulfillment_status = 'delivered' THEN total_paise ELSE 0 END) AS delivered_revenue_paise,
      SUM(shipping_paise) AS total_shipping_paise,
      SUM(CASE WHEN fulfillment_status != 'delivered' THEN shipping_paise ELSE 0 END) AS pending_shipping_paise,
      SUM(CASE WHEN fulfillment_status = 'delivered' THEN shipping_paise ELSE 0 END) AS delivered_shipping_paise
    FROM orders
  `).first<{
    total_orders: number; active_orders: number; delivered_orders: number;
    total_money_paise: number; pending_money_paise: number; delivered_revenue_paise: number;
    total_shipping_paise: number; pending_shipping_paise: number; delivered_shipping_paise: number;
  }>();
  const totalMoneyPaise = summary?.total_money_paise || 0;
  const totalShippingPaise = summary?.total_shipping_paise || 0;
  return json({
    totalOrders: summary?.total_orders || 0,
    activeOrders: summary?.active_orders || 0,
    deliveredOrders: summary?.delivered_orders || 0,
    totalMoneyPaise,
    pendingMoneyPaise: summary?.pending_money_paise || 0,
    deliveredMoneyPaise: summary?.delivered_revenue_paise || 0,
    totalShippingPaise,
    pendingShippingPaise: summary?.pending_shipping_paise || 0,
    deliveredShippingPaise: summary?.delivered_shipping_paise || 0,
    totalProfitPaise: totalMoneyPaise - totalShippingPaise,
  }, 200, origin);
}

async function updateAdminOrder(request: Request, env: Env, origin: string, orderId: string) {
  if (!env.DB) return json({ error: 'Order database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const body = await request.json() as { fulfillmentStatus?: string };
  const allowed = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];
  if (!body.fulfillmentStatus || !allowed.includes(body.fulfillmentStatus)) {
    return json({ error: 'Invalid fulfilment status.' }, 400, origin);
  }
  const existing = await env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(orderId).first();
  if (!existing) return json({ error: 'Order not found.' }, 404, origin);
  await env.DB.batch([
    env.DB.prepare('UPDATE orders SET fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(body.fulfillmentStatus, orderId),
    env.DB.prepare(`INSERT INTO order_events (order_id, event_type, message) VALUES (?, 'fulfillment.updated', ?)`)
      .bind(orderId, `Fulfilment status changed to ${body.fulfillmentStatus}`),
  ]);
  return json({ updated: true }, 200, origin);
}

async function adminProducts(request: Request, env: Env, origin: string) {
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  if (request.method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM products WHERE product_json IS NOT NULL ORDER BY display_order, name').all<Record<string, unknown>>();
    const result = rows.results.map(row => ({ ...(JSON.parse(String(row.product_json)) as Product), id: row.id, name: row.name, price: Number(row.price_paise) / 100, price_paise: row.price_paise, active: row.active, featured: row.featured, fifa_featured: row.fifa_featured, display_order: row.display_order, customizableProperties: row.customization_json == null ? [] : parseCustomizationFields(row.customization_json) }));
    return json({ products: result, total: result.length }, 200, origin);
  }
  const body = await request.json() as { product?: Product & { active?: boolean; featured?: boolean; fifa_featured?: boolean } };
  const product = body.product;
  if (!product || !/^[A-Za-z0-9_-]{2,50}$/.test(product.id) || !product.name?.trim() || !Number.isFinite(product.price) || product.price <= 0) return json({ error: 'Valid product ID, name, and price are required.' }, 400, origin);
  const existing = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(product.id).first();
  if (existing) return json({ error: 'A product with this ID already exists.' }, 409, origin);
  const fields = parseCustomizationFields(product.customizableProperties || []);
  const base = { ...product, customizableProperties: undefined, active: undefined, featured: undefined, fifa_featured: undefined };
  await env.DB.batch([
    env.DB.prepare('UPDATE products SET display_order = display_order + 1'),
    env.DB.prepare(`INSERT INTO products (id, name, price_paise, stock_quantity, active, featured, fifa_featured, display_order, product_json, customization_json) VALUES (?, ?, ?, 0, ?, ?, ?, 1, ?, ?)`)
      .bind(product.id, product.name.trim(), Math.round(product.price * 100), product.active === false ? 0 : 1, product.featured === true ? 1 : 0, product.fifa_featured === true ? 1 : 0, JSON.stringify(base), JSON.stringify(fields)),
  ]);
  return json({ created: product.id }, 201, origin);
}

async function reorderAdminProducts(request: Request, env: Env, origin: string) {
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const body = await request.json() as { productIds?: unknown };
  if (!Array.isArray(body.productIds) || body.productIds.some(id => typeof id !== 'string')) {
    return json({ error: 'The product order must contain every catalogue product exactly once.' }, 400, origin);
  }
  const productIds = body.productIds as string[];
  const rows = await env.DB.prepare('SELECT id FROM products WHERE product_json IS NOT NULL').all<{ id: string }>();
  if (productIds.length !== rows.results.length || new Set(productIds).size !== rows.results.length || rows.results.some(product => !productIds.includes(product.id))) {
    return json({ error: 'The product order must contain every catalogue product exactly once.' }, 400, origin);
  }
  await env.DB.batch(productIds.map((id, index) => env.DB!.prepare('UPDATE products SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(index + 1, id)));
  return json({ updated: productIds.length }, 200, origin);
}

async function saveAdminProductSettings(request: Request, env: Env, origin: string) {
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const body = await request.json() as { products?: unknown };
  if (!Array.isArray(body.products)) return json({ error: 'Settings must include every catalogue product.' }, 400, origin);
  const rows = await env.DB.prepare('SELECT id FROM products WHERE product_json IS NOT NULL').all<{ id: string }>();
  if (body.products.length !== rows.results.length) return json({ error: 'Settings must include every catalogue product.' }, 400, origin);
  const catalogueIds = new Set(rows.results.map(product => product.id));
  const seen = new Set<string>();
  const settings = body.products.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid product settings.');
    const item = raw as Record<string, unknown>;
    const id = String(item.id || '');
    if (!catalogueIds.has(id) || seen.has(id)) throw new Error('Invalid or duplicate product in settings.');
    seen.add(id);
    const pricePaise = Number(item.price_paise);
    if (!Number.isInteger(pricePaise) || pricePaise <= 0 || pricePaise > 100000000) throw new Error(`Invalid price for ${id}.`);
    return { id, pricePaise, active: item.active === true || item.active === 1, featured: item.featured === true || item.featured === 1, fifaFeatured: item.fifa_featured === true || item.fifa_featured === 1, fields: parseCustomizationFields(item.customizableProperties), order: index + 1 };
  });
  await env.DB.batch(settings.map(item => env.DB!.prepare(`UPDATE products SET price_paise = ?, active = ?, featured = ?, fifa_featured = ?, customization_json = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(item.pricePaise, item.active ? 1 : 0, item.featured ? 1 : 0, item.fifaFeatured ? 1 : 0, JSON.stringify(item.fields), item.order, item.id)));
  return json({ updated: settings.length }, 200, origin);
}

async function updateAdminProduct(request: Request, env: Env, origin: string, productId: string) {
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const body = await request.json() as { active?: boolean; featured?: boolean; fifa_featured?: boolean; customizableProperties?: unknown; product?: Product };
  const existing = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(productId).first();
  if (!existing) return json({ error: 'Product not found. Sync products first.' }, 404, origin);
  const fieldsSource = body.product?.customizableProperties ?? body.customizableProperties;
  const fields = fieldsSource === undefined ? undefined : parseCustomizationFields(fieldsSource);
  const product = body.product;
  if (product && (!product.name?.trim() || !Number.isFinite(product.price) || product.price <= 0)) return json({ error: 'Valid product name and price are required.' }, 400, origin);
  const base = product ? { ...product, id: productId, customizableProperties: undefined, active: undefined, featured: undefined, fifa_featured: undefined } : undefined;
  await env.DB.prepare(`UPDATE products SET name = COALESCE(?, name), price_paise = COALESCE(?, price_paise), active = COALESCE(?, active), featured = COALESCE(?, featured), fifa_featured = COALESCE(?, fifa_featured), customization_json = COALESCE(?, customization_json), product_json = COALESCE(?, product_json), updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(product?.name.trim() ?? null, product ? Math.round(product.price * 100) : null, typeof (product?.active ?? body.active) === 'boolean' ? ((product?.active ?? body.active) ? 1 : 0) : null, typeof (product?.featured ?? body.featured) === 'boolean' ? ((product?.featured ?? body.featured) ? 1 : 0) : null, typeof (product?.fifa_featured ?? body.fifa_featured) === 'boolean' ? ((product?.fifa_featured ?? body.fifa_featured) ? 1 : 0) : null, fields === undefined ? null : JSON.stringify(fields), base === undefined ? null : JSON.stringify(base), productId).run();
  return json({ updated: true }, 200, origin);
}

async function deleteAdminProduct(request: Request, env: Env, origin: string, productId: string) {
  if (!env.DB || !await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const used = await env.DB.prepare('SELECT id FROM order_items WHERE product_id = ? LIMIT 1').bind(productId).first();
  if (used) return json({ error: 'Products used in orders cannot be deleted. Mark it unavailable instead.' }, 409, origin);
  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(productId).run();
  return json({ deleted: true }, 200, origin);
}

async function publicCatalogue(env: Env, origin: string) {
  if (!env.DB) return json({ products: [] }, 503, origin);
  const rows = await env.DB.prepare('SELECT id, name, price_paise, active, featured, fifa_featured, display_order, product_json, customization_json FROM products WHERE product_json IS NOT NULL ORDER BY display_order, name').all<{ id: string; name: string; price_paise: number; active: number; featured: number; fifa_featured: number; display_order: number; product_json: string; customization_json: string | null }>();
  const catalogue = rows.results.map(row => ({ ...(JSON.parse(row.product_json) as Product), id: row.id, name: row.name, price: row.price_paise / 100, active: Boolean(row.active), featured: Boolean(row.featured), fifa_featured: Boolean(row.fifa_featured), customizableProperties: row.customization_json == null ? [] : parseCustomizationFields(row.customization_json) }));
  const response = json({ products: catalogue }, 200, origin);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

const defaultFifaCampaign: FifaCampaignConfig = {
  enabled: true,
  headline: 'FIFA World Cup 2026',
  description: 'Football-inspired prints for the road to 2026.',
  largeDescription: 'A special football-inspired collection celebrating the road to FIFA World Cup 2026, featuring playful prints for fans, desks, keys, and match-day energy.',
  accentColor: '#ffd07a',
  animationStyle: 'arrow',
};

async function fifaCampaignConfig(request: Request, env: Env, origin: string, admin = false) {
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503, origin);
  if (admin && !await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  if (request.method === 'GET') {
    const setting = await env.DB.prepare("SELECT value FROM commerce_settings WHERE key = 'fifa_campaign_config'").first<{ value: string }>();
    return json(setting?.value ? JSON.parse(setting.value) : defaultFifaCampaign, 200, origin);
  }
  const body = await request.json() as Partial<FifaCampaignConfig>;
  const animationStyles = new Set(['none', 'shimmer', 'arrow', 'pulse']);
  const config: FifaCampaignConfig = {
    enabled: body.enabled === true,
    headline: String(body.headline || '').trim().slice(0, 100),
    description: String(body.description || '').trim().slice(0, 240),
    largeDescription: String(body.largeDescription || '').trim().slice(0, 1000),
    accentColor: /^#[0-9a-f]{6}$/i.test(String(body.accentColor || '')) ? String(body.accentColor) : '#ffd07a',
    animationStyle: animationStyles.has(String(body.animationStyle)) ? body.animationStyle as FifaCampaignConfig['animationStyle'] : 'none',
  };
  if (!config.headline || !config.description) return json({ error: 'Headline and description are required.' }, 400, origin);
  await env.DB.prepare(`INSERT INTO commerce_settings (key, value, updated_at) VALUES ('fifa_campaign_config', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`).bind(JSON.stringify(config)).run();
  return json(config, 200, origin);
}

async function publicAvailability(env: Env, origin: string) {
  if (!env.DB) return json({ products: {}, customization: {} }, 200, origin);
  const rows = await env.DB.prepare('SELECT id, price_paise, active, featured, fifa_featured, display_order, customization_json FROM products ORDER BY display_order, name').all<{ id: string; price_paise: number; active: number; featured: number; fifa_featured: number; display_order: number; customization_json: string | null }>();
  return json({ products: Object.fromEntries(rows.results.map(row => [row.id, Boolean(row.active)])), prices: Object.fromEntries(rows.results.map(row => [row.id, row.price_paise / 100])), featured: Object.fromEntries(rows.results.map(row => [row.id, Boolean(row.featured)])), fifaFeatured: Object.fromEntries(rows.results.map(row => [row.id, Boolean(row.fifa_featured)])), order: rows.results.map(row => row.id), customization: Object.fromEntries(rows.results.filter(row => row.customization_json != null).map(row => [row.id, parseCustomizationFields(row.customization_json)])) }, 200, origin);
}

async function setInventoryEnabled(request: Request, env: Env, origin: string) {
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const body = await request.json() as { enabled?: boolean };
  await env.DB.prepare(`
    INSERT INTO commerce_settings (key, value, updated_at) VALUES ('inventory_enabled', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).bind(body.enabled === true ? 'true' : 'false').run();
  return json({ enabled: body.enabled === true }, 200, origin);
}

async function razorpayWebhook(request: Request, env: Env) {
  if (!env.DB || !env.RAZORPAY_WEBHOOK_SECRET) return new Response('Webhook not configured', { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get('X-Razorpay-Signature') || '';
  if (!constantTimeEqual(await hmacHex(raw, env.RAZORPAY_WEBHOOK_SECRET), signature)) {
    return new Response('Invalid signature', { status: 400 });
  }
  const eventId = request.headers.get('X-Razorpay-Event-Id') || await sha256Hex(raw);
  const seen = await env.DB.prepare('SELECT id FROM webhook_events WHERE id = ?').bind(eventId).first();
  if (seen) return new Response('ok');
  const event = JSON.parse(raw) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string; amount?: number } } };
  };
  const payment = event.payload?.payment?.entity;
  if (payment?.order_id && payment.id && ['payment.captured', 'order.paid'].includes(event.event || '')) {
    const order = await env.DB.prepare('SELECT id, payment_status FROM orders WHERE razorpay_order_id = ?')
      .bind(payment.order_id).first<{ id: string; payment_status: string }>();
    if (order) {
      const statements: D1Statement[] = [];
      if (order.payment_status !== 'paid') {
        const quantities = await env.DB.prepare('SELECT product_id, SUM(quantity) AS quantity FROM order_items WHERE order_id = ? GROUP BY product_id')
          .bind(order.id).all<{ product_id: string; quantity: number }>();
        for (const item of quantities.results) {
          statements.push(env.DB.prepare('UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(item.quantity, item.product_id));
        }
      }
      statements.push(
        env.DB.prepare("UPDATE orders SET razorpay_payment_id = ?, payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(payment.id, order.id),
        env.DB.prepare(`INSERT OR REPLACE INTO payments (id, order_id, razorpay_order_id, status, amount_paise, payload_json, updated_at)
          VALUES (?, ?, ?, 'captured', ?, ?, CURRENT_TIMESTAMP)`).bind(payment.id, order.id, payment.order_id, payment.amount || 0, raw),
        env.DB.prepare("INSERT INTO order_events (order_id, event_type, message) VALUES (?, 'payment.captured', 'Payment captured by Razorpay webhook')").bind(order.id),
      );
      await env.DB.batch(statements);
      await sendOrderConfirmation(env, order.id);
    }
  }
  await env.DB.prepare('INSERT INTO webhook_events (id, provider, event_type) VALUES (?, ?, ?)')
    .bind(eventId, 'razorpay', event.event || 'unknown').run();
  return new Response('ok');
}

async function trackOrder(request: Request, env: Env, origin: string) {
  if (!env.DB) return json({ error: 'Tracking is unavailable.' }, 503, origin);
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order')?.trim() || '';
  if (!orderId || !/^MB-[A-Z0-9-]{8,40}$/i.test(orderId)) return json({ error: 'A valid order reference is required.' }, 400, origin);
  const now = Math.floor(Date.now() / 1000);
  const ipHash = await sha256Hex(`${request.headers.get('CF-Connecting-IP') || 'unknown'}:${env.ADMIN_SESSION_SECRET}`);
  const limit = await env.DB.prepare('SELECT request_count, window_started_at FROM tracking_rate_limits WHERE ip_hash = ?')
    .bind(ipHash).first<{ request_count: number; window_started_at: number }>();
  const insideWindow = Boolean(limit && now - limit.window_started_at < 60);
  const requestCount = insideWindow ? (limit?.request_count || 0) + 1 : 1;
  if (requestCount > 30) return json({ error: 'Too many tracking requests. Please wait and try again.' }, 429, origin);
  await env.DB.prepare(`INSERT INTO tracking_rate_limits (ip_hash, request_count, window_started_at) VALUES (?, ?, ?)
    ON CONFLICT(ip_hash) DO UPDATE SET request_count=excluded.request_count, window_started_at=excluded.window_started_at`)
    .bind(ipHash, requestCount, insideWindow ? limit!.window_started_at : now).run();
  const order = await env.DB.prepare(`SELECT id, payment_status, fulfillment_status, created_at, updated_at
    FROM orders WHERE id = ?`).bind(orderId).first<Record<string, unknown>>();
  if (!order) return json({ error: 'Order could not be found.' }, 404, origin);
  const items = await env.DB.prepare('SELECT product_name, quantity FROM order_items WHERE order_id = ?')
    .bind(orderId).all<Record<string, unknown>>();
  let shipment = await env.DB.prepare('SELECT provider, awb, status, tracking_url, updated_at FROM shipments WHERE order_id = ?')
    .bind(orderId).first<Record<string, unknown>>();
  const lastRefresh = shipment?.updated_at ? Date.parse(`${String(shipment.updated_at).replace(' ', 'T')}Z`) : 0;
  if (shipment?.awb && env.DELHIVERY_API_TOKEN && Date.now() - lastRefresh > 10 * 60 * 1000) {
    try {
      const baseUrl = (env.DELHIVERY_API_BASE_URL || 'https://track.delhivery.com').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(String(shipment.awb))}`, { headers: { Authorization: `Token ${env.DELHIVERY_API_TOKEN}` } });
      const result = await response.json() as { ShipmentData?: Array<{ Shipment?: { Status?: { Status?: string } } }> };
      const status = result.ShipmentData?.[0]?.Shipment?.Status?.Status;
      if (response.ok && status) {
        const normalized = status.toLowerCase();
        const fulfillment = normalized.includes('delivered') ? 'delivered' : normalized.includes('transit') || normalized.includes('dispatch') ? 'shipped' : 'processing';
        await env.DB.batch([
          env.DB.prepare('UPDATE shipments SET status = ?, payload_json = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?').bind(status, JSON.stringify(result), orderId),
          env.DB.prepare('UPDATE orders SET fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(fulfillment, orderId),
          env.DB.prepare("INSERT INTO order_events (order_id, event_type, message) VALUES (?, 'shipment.updated', ?)").bind(orderId, `Delhivery status: ${status}`),
        ]);
        shipment = await env.DB.prepare('SELECT provider, awb, status, tracking_url, updated_at FROM shipments WHERE order_id = ?').bind(orderId).first<Record<string, unknown>>();
        order.fulfillment_status = fulfillment;
      }
    } catch (error) { console.error('Customer tracking refresh failed', error); }
  }
  const events = await env.DB.prepare('SELECT event_type, message, created_at FROM order_events WHERE order_id = ? ORDER BY created_at DESC LIMIT 30')
    .bind(orderId).all<Record<string, unknown>>();
  return json({ order, items: items.results, shipment, events: events.results }, 200, origin);
}

async function createDelhiveryShipment(request: Request, env: Env, origin: string, orderId: string) {
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503, origin);
  if (!await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  const body = await request.json() as { awb?: string };
  const awb = body.awb?.trim() || '';
  if (!/^[A-Za-z0-9-]{6,40}$/.test(awb)) return json({ error: 'Enter a valid Delhivery AWB.' }, 400, origin);
  const order = await env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return json({ error: 'Order not found.' }, 404, origin);
  const trackingUrl = `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO shipments (order_id, provider, awb, status, tracking_url, payload_json)
      VALUES (?, 'delhivery', ?, ?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET awb=excluded.awb,status=excluded.status,tracking_url=excluded.tracking_url,payload_json=excluded.payload_json,updated_at=CURRENT_TIMESTAMP`)
      .bind(orderId, awb, 'awb added', trackingUrl, null),
    env.DB.prepare("UPDATE orders SET fulfillment_status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderId),
    env.DB.prepare("INSERT INTO order_events (order_id, event_type, message) VALUES (?, 'shipment.created', ?)").bind(orderId, `Delhivery AWB added: ${awb}`),
  ]);
  return json({ awb, trackingUrl }, 200, origin);
}

async function syncDelhiveryShipment(request: Request, env: Env, origin: string, orderId: string) {
  if (!env.DB || !await validAdminToken(request, env)) return json({ error: 'Admin login required.' }, 401, origin);
  if (!env.DELHIVERY_API_TOKEN) return json({ error: 'Delhivery is not configured.' }, 503, origin);
  const shipment = await env.DB.prepare('SELECT awb FROM shipments WHERE order_id = ?').bind(orderId).first<{ awb: string }>();
  if (!shipment?.awb) return json({ error: 'Shipment not found.' }, 404, origin);
  const baseUrl = (env.DELHIVERY_API_BASE_URL || 'https://track.delhivery.com').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/v1/packages/json/?waybill=${encodeURIComponent(shipment.awb)}`, { headers: { Authorization: `Token ${env.DELHIVERY_API_TOKEN}` } });
  const result = await response.json() as { ShipmentData?: Array<{ Shipment?: { Status?: { Status?: string } } }> };
  const status = result.ShipmentData?.[0]?.Shipment?.Status?.Status;
  if (!response.ok || !status) return json({ error: 'Could not refresh Delhivery tracking.' }, 502, origin);
  const normalized = status.toLowerCase();
  const fulfillment = normalized.includes('delivered') ? 'delivered' : normalized.includes('transit') || normalized.includes('dispatch') ? 'shipped' : 'processing';
  await env.DB.batch([
    env.DB.prepare('UPDATE shipments SET status = ?, payload_json = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?').bind(status, JSON.stringify(result), orderId),
    env.DB.prepare('UPDATE orders SET fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(fulfillment, orderId),
    env.DB.prepare("INSERT INTO order_events (order_id, event_type, message) VALUES (?, 'shipment.updated', ?)").bind(orderId, `Delhivery status: ${status}`),
  ]);
  return json({ status, fulfillment }, 200, origin);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestPath = new URL(request.url).pathname.replace(/\/$/, '');
    if (requestPath === '/webhooks/razorpay' && request.method === 'POST') {
      try { return await razorpayWebhook(request, env); } catch (error) { console.error('Razorpay webhook error', error); return new Response('Webhook error', { status: 500 }); }
    }
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
    try {
      const path = requestPath;
      if (path === '/admin/login' && request.method === 'POST') return await adminLogin(request, env, origin);
      if (path === '/admin/orders' && request.method === 'GET') return await listAdminOrders(request, env, origin);
      if (path === '/admin/dashboard' && request.method === 'GET') return await adminDashboard(request, env, origin);
      if (path === '/admin/products' && ['GET', 'POST'].includes(request.method)) return await adminProducts(request, env, origin);
      if (path === '/admin/products/order' && request.method === 'PATCH') return await reorderAdminProducts(request, env, origin);
      if (path === '/admin/products/settings' && request.method === 'PATCH') return await saveAdminProductSettings(request, env, origin);
      if (path === '/admin/featured-config' && ['GET', 'PATCH'].includes(request.method)) return await fifaCampaignConfig(request, env, origin, true);
      if (path === '/admin/inventory' && request.method === 'PATCH') return await setInventoryEnabled(request, env, origin);
      const adminProductMatch = path.match(/^\/admin\/products\/([^/]+)$/);
      if (adminProductMatch && request.method === 'PATCH') return await updateAdminProduct(request, env, origin, decodeURIComponent(adminProductMatch[1]));
      if (adminProductMatch && request.method === 'DELETE') return await deleteAdminProduct(request, env, origin, decodeURIComponent(adminProductMatch[1]));
      const adminOrderMatch = path.match(/^\/admin\/orders\/([^/]+)$/);
      if (adminOrderMatch && request.method === 'PATCH') {
        return await updateAdminOrder(request, env, origin, decodeURIComponent(adminOrderMatch[1]));
      }
      const shipmentMatch = path.match(/^\/admin\/orders\/([^/]+)\/shipment$/);
      if (shipmentMatch && request.method === 'POST') return await createDelhiveryShipment(request, env, origin, decodeURIComponent(shipmentMatch[1]));
      if (shipmentMatch && request.method === 'PATCH') return await syncDelhiveryShipment(request, env, origin, decodeURIComponent(shipmentMatch[1]));
      if (path === '/track' && request.method === 'GET') return await trackOrder(request, env, origin);
      if (path === '/availability' && request.method === 'GET') return await publicAvailability(env, origin);
      if (path === '/catalogue' && request.method === 'GET') return await publicCatalogue(env, origin);
      if (path === '/featured-config' && request.method === 'GET') return await fifaCampaignConfig(request, env, origin);
      if (path === '/create-order' && request.method === 'POST') return await createOrder(request, env, origin);
      if (path === '/checkout/order' && request.method === 'POST') return await createOrder(request, env, origin, true);
      if (path === '/verify-payment' && request.method === 'POST') return await verifyPayment(request, env, origin);
      return json({ error: 'Not found.' }, 404, origin);
    } catch (error) {
      console.error('Razorpay Worker error', error);
      return json({ error: 'Invalid request.' }, 400, origin);
    }
  },
};

export default worker;
