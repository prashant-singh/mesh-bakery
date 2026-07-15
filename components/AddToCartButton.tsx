'use client';

import React from 'react';
import { Check, ShoppingBag } from 'lucide-react';
import { useCart, type CartProduct } from '@/components/CartProvider';

export function AddToCartButton({ product, disabled = false, disabledLabel = 'complete required fields' }: { product: CartProduct; disabled?: boolean; disabledLabel?: string }) {
  const { addItem } = useCart();
  const [added, setAdded] = React.useState(false);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#ff6b35] text-sm font-bold tracking-widest text-white transition-colors hover:bg-[#e85c29] disabled:cursor-not-allowed disabled:bg-[#d8cbb8] disabled:text-[#3d3a36]/45"
    >
      {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {disabled ? disabledLabel : added ? 'added to cart' : 'add to cart'}
    </button>
  );
}
