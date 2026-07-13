import products from '../../public/products.json';

type Product = { id: string; name: string; price: number };

type Env = {
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  ALLOWED_ORIGINS: string;
  PICKUP_PINCODE: string;
};

type PaymentResponse = {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

const encoder = new TextEncoder();

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

async function createOrder(request: Request, env: Env, origin: string) {
  const { productId } = await request.json() as { productId?: string };
  const product = (products as Product[]).find(item => item.id === productId);

  if (!product || !Number.isFinite(product.price) || product.price <= 0) {
    return json({ error: 'Invalid product.' }, 400, origin);
  }

  const amount = Math.round(product.price * 100);
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
      notes: { product_id: product.id, product_name: product.name },
    }),
  });
  const order = await response.json() as { id?: string; amount?: number; currency?: string; error?: { description?: string } };

  if (!response.ok || !order.id) {
    console.error('Razorpay order creation failed', response.status, order.error?.description);
    return json({ error: 'Could not create the payment order.' }, 502, origin);
  }

  return json({ id: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID }, 200, origin);
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
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await request.json() as PaymentResponse;
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
      if (path === '/verify-payment') return await verifyPayment(request, env, origin);
      return json({ error: 'Not found.' }, 404, origin);
    } catch (error) {
      console.error('Razorpay Worker error', error);
      return json({ error: 'Invalid request.' }, 400, origin);
    }
  },
};
