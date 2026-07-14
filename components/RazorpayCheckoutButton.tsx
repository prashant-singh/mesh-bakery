'use client';

import React from 'react';
import { RAZORPAY_API_URL } from '@/lib/config';

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void | Promise<void>;
  theme: { color: string };
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

type Props = {
  productId: string;
  productName: string;
};

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay Checkout.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
}

export function RazorpayCheckoutButton({ productId, productName }: Props) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');

  const startCheckout = async () => {
    setStatus('loading');
    setMessage('');

    try {
      if (!RAZORPAY_API_URL) {
        throw new Error('Checkout is not configured yet.');
      }

      const [orderResponse] = await Promise.all([
        fetch(`${RAZORPAY_API_URL}/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        }),
        loadCheckoutScript(),
      ]);

      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || 'Could not create the payment order.');
      if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable.');

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'mesh bakery',
        description: productName,
        order_id: order.id,
        theme: { color: '#ff6b35' },
        modal: { ondismiss: () => setStatus('idle') },
        handler: async (payment: RazorpayResponse) => {
          setStatus('loading');
          const verificationResponse = await fetch(`${RAZORPAY_API_URL}/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payment),
          });
          const verification = await verificationResponse.json();

          if (!verificationResponse.ok || !verification.verified) {
            setStatus('error');
            setMessage(verification.error || 'Payment could not be verified. Please contact us before retrying.');
            return;
          }

          setStatus('success');
          setMessage(
            verification.captured
              ? `Payment confirmed. Reference: ${payment.razorpay_payment_id}`
              : `Payment received and awaiting capture. Reference: ${payment.razorpay_payment_id}`
          );
        },
      });

      checkout.open();
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Checkout could not be started.');
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={startCheckout}
        disabled={status === 'loading' || status === 'success'}
        className="w-full bg-[#ff6b35] text-white h-14 rounded-full flex items-center justify-center gap-2 text-sm font-bold tracking-widest transition-colors duration-150 hover:bg-[#e85c29] disabled:cursor-not-allowed disabled:opacity-65"
      >
        {status === 'loading' ? 'processing…' : status === 'success' ? 'payment complete' : 'buy now'}
      </button>
      {message && (
        <p className={`mt-3 text-center text-xs leading-relaxed ${status === 'success' ? 'text-[#5b6346]' : 'text-red-700'}`} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
