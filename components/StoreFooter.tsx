'use client';

import Link from 'next/link';
import { Instagram, Landmark, ShieldCheck, WalletCards } from 'lucide-react';
import { withBasePath } from '@/lib/config';

export function StoreFooter() {
  return (
    <footer className="mt-12 w-full border-t border-slate-800 bg-slate-900 py-8 text-slate-400">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-7 rounded-2xl border border-slate-800 bg-slate-950/40 px-5 py-5 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> secure payments powered by Razorpay
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3" aria-label="supported payment methods">
            <span className="rounded-md bg-white px-3 py-1.5 text-sm font-black italic tracking-tight text-[#1434cb]" aria-label="Visa">VISA</span>
            <span className="flex h-8 items-center rounded-md bg-white px-3" aria-label="Mastercard"><span className="h-5 w-5 rounded-full bg-[#eb001b]"/><span className="-ml-2 h-5 w-5 rounded-full bg-[#f79e1b]/90"/></span>
            <span className="rounded-md bg-white px-3 py-1.5 text-sm font-extrabold text-[#243b80]" aria-label="RuPay">RuPay<span className="ml-1 text-[#f58220]">››</span></span>
            <span className="rounded-md bg-white px-3 py-1.5 text-sm font-black text-[#252525]" aria-label="UPI">UPI <span className="text-[#ef7f1a]">▰</span><span className="text-[#168b45]">▰</span></span>
            <span className="flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-white"><Landmark className="h-4 w-4"/> Netbanking</span>
            <span className="flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-white"><WalletCards className="h-4 w-4"/> Wallets</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Available methods are confirmed securely at checkout and may vary by eligibility.</p>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-xs">&copy; {new Date().getFullYear()} MeshBakery</div>
          <div className="flex items-center gap-6 text-sm">
            <Link href={withBasePath('/return-policy')} className="underline decoration-slate-700 underline-offset-4 transition-colors hover:text-white hover:decoration-white">Return Policy</Link>
            <span className="hidden h-4 w-px bg-slate-800 sm:block" />
            <a href="https://www.instagram.com/meshbakeryprints/" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1.5 transition-colors hover:text-white" aria-label="Follow us on Instagram">
              <Instagram className="h-4 w-4 transition-colors group-hover:text-pink-500"/><span className="font-medium">Instagram</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
