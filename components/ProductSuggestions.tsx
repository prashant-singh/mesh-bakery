'use client';

import Image from 'next/image';

export type SuggestedProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
};

const formatInr = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);

export function ProductSuggestions({ products, onSelect }: {
  products: SuggestedProduct[];
  onSelect: (productId: string) => void;
}) {
  if (products.length === 0) return null;

  return (
    <section className="border-t border-[#e9e4db] bg-[#f3eee6] px-6 py-12 md:px-12 md:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b6346]">more from the bakery</p>
        <h2 className="mt-2 font-serif text-3xl font-light text-[#2d2a26] md:text-4xl">you may also like</h2>
        <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {products.map(product => (
            <button key={product.id} type="button" onClick={() => onSelect(product.id)} className="group overflow-hidden rounded-[18px] border border-[#d8cbb8]/70 bg-[#fbf7f2] text-left transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(45,42,38,0.1)]">
              <div className="relative aspect-square overflow-hidden bg-[#e9e4db]">
                {product.imageUrl && <Image src={product.imageUrl} alt={product.name} fill className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" sizes="(max-width: 768px) 50vw, 25vw" />}
              </div>
              <div className="p-3.5 md:p-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#5b6346]">{product.category}</p>
                <h3 className="mt-1 line-clamp-2 font-serif text-lg leading-tight text-[#2d2a26]">{product.name}</h3>
                <p className="mt-2 text-sm font-bold text-[#ff6b35]">{formatInr(product.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
