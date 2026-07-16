'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, LockKeyhole, ShoppingBag } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import { StoreFooter } from '@/components/StoreFooter';
import { RAZORPAY_API_URL, withBasePath } from '@/lib/config';

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
};

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const emptyForm: CheckoutForm = {
  name: '', email: '', phone: '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '',
};
const scriptUrl = 'https://checkout.razorpay.com/v1/checkout.js';
const FREE_SHIPPING_THRESHOLD = 499;
const STANDARD_SHIPPING = 70;
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validMobile = (value: string) => /^(?:\+91|91|0)?[6-9][0-9]{9}$/.test(value.replace(/[\s-]/g, ''));
const formatInr = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay Checkout.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = React.useState<CheckoutForm>(emptyForm);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');
  const [confirmedOrder, setConfirmedOrder] = React.useState<{ id: string; token: string; paymentId: string } | null>(null);
  const [touched, setTouched] = React.useState({ phone: false, email: false });
  const shipping = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const total = subtotal + shipping;
  const phoneError = (touched.phone || form.phone.length > 0) && !validMobile(form.phone)
    ? 'Enter a valid 10-digit Indian mobile number.' : '';
  const emailError = (touched.email || form.email.length > 0) && !validEmail(form.email)
    ? 'Enter a valid email address.' : '';

  const update = (field: keyof CheckoutForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(current => ({ ...current, [field]: event.target.value }));
  };

  const startPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched({ phone: true, email: true });
    if (!validMobile(form.phone) || !validEmail(form.email)) {
      setStatus('error');
      setMessage('Please correct the highlighted contact details.');
      return;
    }
    setStatus('loading');
    setMessage('');

    try {
      if (!RAZORPAY_API_URL) throw new Error('Checkout API is not configured.');
      if (items.length === 0) throw new Error('Your cart is empty.');

      const [orderResponse] = await Promise.all([
        fetch(`${RAZORPAY_API_URL}/checkout/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(item => ({ productId: item.id, quantity: item.quantity, customization: item.customization })),
            customer: { name: form.name, email: form.email, phone: form.phone },
            address: {
              line1: form.line1, line2: form.line2, landmark: form.landmark,
              city: form.city, state: form.state, pincode: form.pincode, country: 'IN',
            },
          }),
        }),
        loadRazorpay(),
      ]);
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || 'Could not create your order.');
      if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable.');

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'mesh bakery',
        description: `${items.reduce((total, item) => total + item.quantity, 0)} item order`,
        order_id: order.id,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: '#ff6b35' },
        modal: { ondismiss: () => setStatus('idle') },
          handler: async (payment: RazorpayResponse) => {
          try {
            setStatus('loading');
            const verificationResponse = await fetch(`${RAZORPAY_API_URL}/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payment, internalOrderId: order.internalOrderId }),
            });
            const verification = await verificationResponse.json();
            if (!verificationResponse.ok || !verification.verified) {
              throw new Error(verification.error || 'Payment could not be verified.');
            }

            const record = { id: order.internalOrderId, token: order.trackingToken, paymentId: payment.razorpay_payment_id };
            const previous = JSON.parse(window.localStorage.getItem('mesh-bakery-orders-v1') || '[]') as typeof record[];
            window.localStorage.setItem('mesh-bakery-orders-v1', JSON.stringify([record, ...previous].slice(0, 20)));
            setConfirmedOrder(record);
            clearCart();
            setStatus('success');
          } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Payment verification failed. Contact us before retrying.');
          }
        },
      });
      checkout.open();
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Checkout could not be started.');
    }
  };

  if (status === 'success' && confirmedOrder) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbf7f2] px-6 py-16">
        <div className="w-full max-w-lg rounded-[28px] border border-[#e9e4db] bg-white/70 p-8 text-center shadow-sm md:p-12">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#5b6346]" />
          <h1 className="mt-5 font-serif text-4xl font-light text-[#2d2a26]">payment confirmed</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#3d3a36]/70">Your order reference is <strong>{confirmedOrder.id}</strong>. Keep this reference for support and tracking.</p>
          <p className="mt-2 text-xs text-[#3d3a36]/55">Payment: {confirmedOrder.paymentId}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={withBasePath(`/track?order=${encodeURIComponent(confirmedOrder.id)}`)} className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff6b35] px-7 text-sm font-bold tracking-wider text-white">track this order</Link>
            <Link href={withBasePath('/')} className="inline-flex h-12 items-center justify-center rounded-full bg-[#2d2a26] px-7 text-sm font-bold tracking-wider text-white">back to catalogue</Link>
          </div>
        </div>
      </main>
    );
  }

  const inputClass = 'h-12 w-full rounded-xl border border-[#d8cbb8] bg-white/75 px-4 text-sm text-[#2d2a26] outline-none transition focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]';

  return (
    <div className="min-h-screen bg-[#fbf7f2]">
      <div
        className="overflow-hidden bg-[#2d2a26] py-2.5 text-sm font-bold text-white"
        aria-label="shipping offers"
      >
        <div className="shipping-marquee-track flex w-max items-center whitespace-nowrap">
          {[0, 1, 2, 3].map((copy) => (
            <div
              key={copy}
              className="flex items-center gap-12 pr-12"
              aria-hidden={copy > 0}
            >
              <span>🚀 Free shipping on orders over ₹499!</span>
              <span>🚚 Free Mini Flexi Toy on purchase of ₹599 &amp; above</span>
            </div>
          ))}
        </div>
      </div>
      <main className="px-5 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href={withBasePath('/')} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#2d2a26]"><ArrowLeft className="h-4 w-4" /> continue shopping</Link>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form onSubmit={startPayment} className="rounded-[24px] border border-[#e9e4db] bg-white/65 p-5 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b6346]">guest checkout</p>
            <h1 className="mt-1 font-serif text-4xl font-light text-[#2d2a26]">delivery details</h1>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2 text-xs font-bold">full name<input required autoComplete="name" value={form.name} onChange={update('name')} className={`${inputClass} mt-1.5`} /></label>
              <label className="text-xs font-bold">phone<input required type="tel" autoComplete="tel" inputMode="tel" pattern="(?:\+91[ -]?|91[ -]?|0)?[6-9][0-9]{9}" maxLength={15} title="Enter a valid 10-digit Indian mobile number" value={form.phone} onChange={update('phone')} onBlur={() => setTouched(current => ({ ...current, phone: true }))} aria-invalid={Boolean(phoneError)} aria-describedby="phone-error" className={`${inputClass} mt-1.5 ${phoneError ? 'border-red-600 focus:border-red-600 focus:ring-red-600' : ''}`} />{phoneError && <span id="phone-error" className="mt-1.5 block text-xs font-semibold text-red-700" role="alert">{phoneError}</span>}</label>
              <label className="text-xs font-bold">email<input required type="email" autoComplete="email" value={form.email} onChange={update('email')} onBlur={() => setTouched(current => ({ ...current, email: true }))} aria-invalid={Boolean(emailError)} aria-describedby="email-error" className={`${inputClass} mt-1.5 ${emailError ? 'border-red-600 focus:border-red-600 focus:ring-red-600' : ''}`} />{emailError && <span id="email-error" className="mt-1.5 block text-xs font-semibold text-red-700" role="alert">{emailError}</span>}</label>
              <label className="md:col-span-2 text-xs font-bold">address line 1<input required autoComplete="address-line1" value={form.line1} onChange={update('line1')} className={`${inputClass} mt-1.5`} /></label>
              <label className="md:col-span-2 text-xs font-bold">address line 2 <span className="font-normal opacity-50">(optional)</span><input autoComplete="address-line2" value={form.line2} onChange={update('line2')} className={`${inputClass} mt-1.5`} /></label>
              <label className="md:col-span-2 text-xs font-bold">landmark <span className="font-normal opacity-50">(optional)</span><input value={form.landmark} onChange={update('landmark')} className={`${inputClass} mt-1.5`} /></label>
              <label className="text-xs font-bold">city<input required autoComplete="address-level2" value={form.city} onChange={update('city')} className={`${inputClass} mt-1.5`} /></label>
              <label className="text-xs font-bold">state<input required autoComplete="address-level1" value={form.state} onChange={update('state')} className={`${inputClass} mt-1.5`} /></label>
              <label className="text-xs font-bold">pincode<input required autoComplete="postal-code" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={form.pincode} onChange={update('pincode')} className={`${inputClass} mt-1.5`} /></label>
            </div>
            <div className="mt-6 rounded-xl border border-[#edd28a] bg-[#fff7dc] px-4 py-3 text-xs leading-relaxed text-[#795622]">Standard delivery is ₹70. Delivery is free when the cart value is more than ₹499. Your pincode will be checked for Delhivery prepaid serviceability before payment.</div>
            {message && <p className="mt-4 text-sm text-red-700" role="alert">{message}</p>}
            <button disabled={status === 'loading' || items.length === 0} type="submit" className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#ff6b35] text-sm font-bold tracking-widest text-white hover:bg-[#e85c29] disabled:cursor-not-allowed disabled:opacity-55">
              <LockKeyhole className="h-4 w-4" />{status === 'loading' ? 'preparing payment…' : items.length === 0 ? 'cart is empty' : 'pay securely'}
            </button>
          </form>

          <aside className="h-fit rounded-[24px] border border-[#e9e4db] bg-[#fff1e4] p-5 md:p-6">
            <div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /><h2 className="font-serif text-2xl text-[#2d2a26]">order summary</h2></div>
            <div className="mt-5 space-y-4">
              {items.map(item => (
                <div key={item.cartKey} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#e9e4db]">{item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />}<span className="absolute right-1 top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] font-bold text-white">{item.quantity}</span></div>
                  <div className="min-w-0 flex-1"><p className="line-clamp-2 font-serif text-base leading-tight text-[#2d2a26]">{item.name}</p><p className="mt-1 text-xs text-[#3d3a36]/60">qty {item.quantity}</p>{Object.entries(item.customization ?? {}).filter(([, value]) => value).map(([key, value]) => <p key={key} className="mt-0.5 text-[11px] text-[#795622]">{key}: {value}</p>)}</div>
                  <p className="text-sm font-bold">{formatInr(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-[#d8cbb8] pt-4">
              <div className="flex justify-between text-sm"><span>subtotal</span><span>{formatInr(subtotal)}</span></div>
              <div className="mt-2 flex justify-between text-sm text-[#3d3a36]/60"><span>standard shipping</span><span>{shipping === 0 ? 'free' : formatInr(shipping)}</span></div>
              {shipping > 0 && <p className="mt-2 text-xs text-[#5b6346]">Add {formatInr(FREE_SHIPPING_THRESHOLD + 1 - subtotal)} more for free delivery.</p>}
              <div className="mt-4 flex justify-between border-t border-[#d8cbb8] pt-4 font-bold"><span>total</span><span className="text-lg text-[#ff6b35]">{formatInr(total)}</span></div>
            </div>
          </aside>
        </div>
      </div>
      </main>
      <StoreFooter />
    </div>
  );
}
