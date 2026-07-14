'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { withBasePath } from '@/lib/config';

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
};

export type CartItem = CartProduct & { quantity: number };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  addItem: (product: CartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const STORAGE_KEY = 'mesh-bakery-cart-v1';
const MAX_QUANTITY = 20;
const CartContext = React.createContext<CartContextValue | null>(null);

const formatInr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed.filter(item => item.id && item.quantity > 0));
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (!hasLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hasLoaded, items]);

  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const addItem = React.useCallback((product: CartProduct, quantity = 1) => {
    setItems(current => {
      const existing = current.find(item => item.id === product.id);
      if (!existing) return [...current, { ...product, quantity: Math.min(Math.max(quantity, 1), MAX_QUANTITY) }];
      return current.map(item => item.id === product.id
        ? { ...item, ...product, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY) }
        : item);
    });
    setIsOpen(true);
  }, []);

  const setQuantity = React.useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(current => current.filter(item => item.id !== productId));
      return;
    }
    setItems(current => current.map(item => item.id === productId
      ? { ...item, quantity: Math.min(quantity, MAX_QUANTITY) }
      : item));
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setItems(current => current.filter(item => item.id !== productId));
  }, []);

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal,
      isOpen,
      addItem,
      removeItem,
      setQuantity,
      clearCart: () => setItems([]),
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }}>
      {children}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`open cart with ${itemCount} items`}
        className="fixed right-5 top-5 z-[70] flex h-12 w-12 items-center justify-center rounded-full border border-[#3d3a36]/10 bg-[#fbf7f2]/95 text-[#2d2a26] shadow-lg backdrop-blur transition-transform hover:scale-105 md:right-8 md:top-7"
      >
        <ShoppingBag className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff6b35] px-1 text-[10px] font-bold text-white">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="close cart"
            className="absolute inset-0 bg-[#2d2a26]/35 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#fbf7f2] shadow-2xl" aria-label="shopping cart">
            <div className="flex items-center justify-between border-b border-[#e9e4db] px-5 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b6346]">your basket</p>
                <h2 className="font-serif text-3xl font-light text-[#2d2a26]">cart</h2>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#e9e4db]" aria-label="close cart">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-[#3d3a36]/60">
                  <ShoppingBag className="mb-4 h-10 w-10" />
                  <p className="font-serif text-2xl text-[#2d2a26]">your cart is empty</p>
                  <p className="mt-2 text-sm">add a freshly baked print to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-4 rounded-2xl border border-[#e9e4db] bg-white/65 p-3">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#e9e4db]">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="96px" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="line-clamp-2 font-serif text-lg leading-tight text-[#2d2a26]">{item.name}</h3>
                            <p className="mt-1 text-sm font-bold text-[#ff6b35]">{formatInr(item.price)}</p>
                          </div>
                          <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-[#3d3a36]/45 hover:text-red-700" aria-label={`remove ${item.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 inline-flex items-center rounded-full border border-[#d8cbb8] bg-[#fbf7f2]">
                          <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center" aria-label={`decrease ${item.name} quantity`}>
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center" aria-label={`increase ${item.name} quantity`}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[#e9e4db] bg-[#fff1e4] px-5 py-5">
                <div className="mb-4 flex items-center justify-between text-[#2d2a26]">
                  <span className="text-sm font-bold tracking-wide">subtotal</span>
                  <span className="font-mono text-xl font-bold">{formatInr(subtotal)}</span>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-[#3d3a36]/65">shipping and final availability will be calculated at checkout.</p>
                <Link href={withBasePath('/checkout')} onClick={() => setIsOpen(false)} className="flex h-14 w-full items-center justify-center rounded-full bg-[#2d2a26] text-sm font-bold tracking-widest text-white transition-colors hover:bg-[#1f1c19]">
                  continue to checkout
                </Link>
                <button type="button" onClick={() => setItems([])} className="mt-3 w-full text-center text-xs font-bold text-[#3d3a36]/55 hover:text-red-700">
                  clear cart
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider.');
  return context;
}
