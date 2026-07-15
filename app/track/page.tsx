'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, PackageCheck, Search } from 'lucide-react';
import { RAZORPAY_API_URL, withBasePath } from '@/lib/config';

type TrackingResult = {
  order: { id: string; payment_status: string; fulfillment_status: string; created_at: string };
  items: Array<{ product_name: string; quantity: number }>;
  shipment: null | { awb: string; status: string; tracking_url: string };
  events: Array<{ event_type: string; message: string; created_at: string }>;
};

export default function TrackingPage() {
  const [order, setOrder] = React.useState('');
  const [result, setResult] = React.useState<TrackingResult | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const queryOrder = query.get('order') || '';
    const timer = window.setTimeout(() => setOrder(queryOrder), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function search(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try {
      const response = await fetch(`${RAZORPAY_API_URL}/track?order=${encodeURIComponent(order)}`);
      const data = await response.json() as TrackingResult & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not find this order.');
      setResult(data);
    } catch (value) { setError(value instanceof Error ? value.message : 'Could not load tracking.'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen px-5 py-10 sm:py-16"><div className="mx-auto max-w-2xl">
    <Link href={withBasePath('/')} className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> storefront</Link>
    <div className="mt-8 rounded-[2rem] border border-[#3d3a36]/10 bg-white p-6 shadow-sm sm:p-9">
      <PackageCheck size={36} className="text-[#5b6346]"/><h1 className="mt-4 text-4xl font-semibold">track your order</h1>
      <p className="mt-2 text-sm text-[#3d3a36]/60">enter the order reference shown after checkout.</p>
      <form onSubmit={search} className="mt-7 space-y-4">
        <label className="block text-xs font-bold tracking-wider">order reference<input value={order} onChange={e => setOrder(e.target.value)} required className="mt-2 h-12 w-full rounded-xl border border-[#3d3a36]/20 px-4 font-mono normal-case" placeholder="MB-20260714-…"/></label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#2d2a26] font-bold text-white disabled:opacity-50"><Search size={16}/>{busy ? 'checking…' : 'check status'}</button>
      </form>
    </div>
    {result && <section className="mt-6 rounded-[2rem] border border-[#3d3a36]/10 bg-[#fff1e4] p-6 sm:p-9">
      <p className="font-mono text-sm font-bold normal-case">{result.order.id}</p><h2 className="mt-2 text-3xl font-semibold">{result.order.fulfillment_status}</h2>
      <p className="mt-2 text-sm">payment: <strong>{result.order.payment_status}</strong></p>
      <div className="mt-6 border-t border-[#3d3a36]/10 pt-5">{result.items.map((item, index) => <p key={index} className="text-sm"><strong>{item.quantity} ×</strong> {item.product_name}</p>)}</div>
      {result.shipment?.awb && <div className="mt-5 rounded-xl bg-white p-4 text-sm"><p>delhivery awb: <strong className="normal-case">{result.shipment.awb}</strong></p><p>shipment: {result.shipment.status}</p>{result.shipment.tracking_url && <a className="mt-2 inline-block font-bold underline" href={result.shipment.tracking_url} target="_blank" rel="noreferrer">open delhivery tracking</a>}</div>}
      <div className="mt-6 space-y-3">{result.events.map((event, index) => <div key={index} className="border-l-2 border-[#5b6346] pl-4"><p className="text-sm font-semibold">{event.message || event.event_type}</p><p className="text-xs text-[#3d3a36]/50">{new Date(`${event.created_at}Z`).toLocaleString('en-IN')}</p></div>)}</div>
    </section>}
  </div></main>;
}
