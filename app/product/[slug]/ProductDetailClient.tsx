'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AddToCartButton } from '@/components/AddToCartButton';
import {
  areRequiredCustomizationFieldsFilled,
  CustomizationForm,
  type CustomizableProperty,
  type CustomizationValues,
} from '@/components/CustomizationForm';
import { ProductSuggestions } from '@/components/ProductSuggestions';
import { StoreFooter } from '@/components/StoreFooter';
import { localInventoryMaps } from '@/lib/localInventory';
import { RAZORPAY_API_URL, withBasePath } from '@/lib/config';
import { productPath } from '@/lib/productRoutes';

type ProductMedia = {
  type: 'image' | 'video';
  url: string;
  thumbUrl?: string;
  cardUrl?: string;
  detailUrl?: string;
  posterUrl?: string;
};

export type ProductDetailProduct = {
  id: string;
  name: string;
  category: string;
  media: ProductMedia[];
  tags: unknown[];
  price: number;
  shortDescription: string;
  description: string;
  customizableProperties?: CustomizableProperty[];
  active?: boolean;
  featured?: boolean;
};

const formatInr = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(value);

function mediaUrl(media: ProductMedia, variant: 'thumb' | 'detail') {
  const path = variant === 'thumb'
    ? media.thumbUrl ?? media.cardUrl ?? media.url
    : media.detailUrl ?? media.cardUrl ?? media.url;
  return withBasePath(path);
}

export function ProductDetailClient({ product, suggestions, configurationPreloaded = false }: {
  product: ProductDetailProduct;
  suggestions: ProductDetailProduct[];
  configurationPreloaded?: boolean;
}) {
  const router = useRouter();

  React.useEffect(() => {
    document.title = `mesh bakery | ${product.name}`;
    return () => {
      document.title = 'mesh bakery | 3D Printing Bakery';
    };
  }, [product.name]);

  const [mediaIndex, setMediaIndex] = React.useState(0);
  const [customization, setCustomization] = React.useState<CustomizationValues>({});
  const [available, setAvailable] = React.useState<boolean | null>(configurationPreloaded ? product.active !== false : null);
  const [customizationFields, setCustomizationFields] = React.useState(product.customizableProperties);
  const [price, setPrice] = React.useState(product.price);
  const [configurationLoaded, setConfigurationLoaded] = React.useState(configurationPreloaded);
  const activeMedia = product.media[mediaIndex];
  const expectsCustomization = product.tags.some(tag => typeof tag === 'string' && tag.toLowerCase() === 'customizable');
  const customizationConfigured = !expectsCustomization || Boolean(customizationFields?.length);
  const customizationReady = areRequiredCustomizationFieldsFilled(customizationFields, customization);

  React.useEffect(() => {
    if (configurationPreloaded) return;
    const applyLocal = () => {
      const local=localInventoryMaps();
      if (local.availability[product.id] != null) setAvailable(local.availability[product.id]);
      if (local.customization[product.id]) setCustomizationFields(local.customization[product.id] as CustomizableProperty[]);
      if (local.prices[product.id] != null) setPrice(local.prices[product.id]);
    };
    if (!RAZORPAY_API_URL) { Promise.resolve().then(() => { applyLocal(); setConfigurationLoaded(true); }); return; }
    fetch(`${RAZORPAY_API_URL}/availability`)
      .then(response => response.json())
      .then(data => { const local=localInventoryMaps(); setAvailable((local.availability[product.id] ?? data.products?.[product.id]) !== false); const fields=local.customization[product.id] ?? data.customization?.[product.id]; if (fields) setCustomizationFields(fields as CustomizableProperty[]); const nextPrice=local.prices[product.id] ?? data.prices?.[product.id]; if (nextPrice != null) setPrice(nextPrice); })
      .catch(() => { applyLocal(); setAvailable(current => current ?? null); })
      .finally(() => setConfigurationLoaded(true));
  }, [product.id, configurationPreloaded]);

  const moveMedia = (direction: number) => {
    setMediaIndex(current => (current + direction + product.media.length) % product.media.length);
  };

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#2d2a26]">
      <header className="border-b border-[#e9e4db] bg-[#fff1e4] px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" /> back
          </button>
          <Link href={withBasePath('/')} className="font-serif text-2xl font-light">mesh bakery</Link>
          <Link href={withBasePath('/track')} className="inline-flex items-center gap-2 text-sm font-bold">
            <PackageSearch className="h-4 w-4" /><span className="hidden sm:inline">track order</span>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:px-10 md:py-12">
        <div>
          <div className="relative mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-[24px] bg-[#e9e4db]">
            {activeMedia?.type === 'video' ? (
              <video src={mediaUrl(activeMedia, 'detail')} poster={activeMedia.posterUrl ? withBasePath(activeMedia.posterUrl) : undefined} controls playsInline className="h-full w-full object-contain" />
            ) : activeMedia ? (
              <Image src={mediaUrl(activeMedia, 'detail')} alt={product.name} fill priority className="object-contain p-3 md:p-6" sizes="(max-width: 768px) 100vw, 55vw" />
            ) : null}
            {product.media.length > 1 && <>
              <button type="button" onClick={() => moveMedia(-1)} aria-label="previous image" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"><ChevronLeft /></button>
              <button type="button" onClick={() => moveMedia(1)} aria-label="next image" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"><ChevronRight /></button>
            </>}
          </div>
          {product.media.length > 1 && <div className="mt-4 flex justify-center gap-3">
            {product.media.map((media, index) => <button key={`${media.url}-${index}`} type="button" onClick={() => setMediaIndex(index)} className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 bg-[#e9e4db] ${index === mediaIndex ? 'border-[#ff6b35]' : 'border-transparent'}`} aria-label={`show media ${index + 1}`}>
              {media.type === 'image' ? <Image src={mediaUrl(media, 'thumb')} alt="" fill className="object-cover" sizes="64px" /> : <span className="flex h-full items-center justify-center text-[10px] font-bold">video</span>}
            </button>)}
          </div>}
        </div>

        <div className="self-start md:sticky md:top-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b6346]">{product.category}</p>
          <h1 className="mt-2 font-serif text-4xl font-light leading-tight md:text-5xl">{product.name}</h1>
          {configurationLoaded ? <p className="mt-4 font-mono text-2xl font-bold text-[#ff6b35]">{formatInr(price)}</p> : <div className="mt-4 h-8 w-28 animate-pulse rounded-lg bg-[#e3ddd5]" aria-label="loading price" />}
          <p className="mt-5 leading-relaxed text-[#3d3a36]/75">{product.description}</p>
          <div className="mt-6">
            <CustomizationForm fields={customizationFields} values={customization} onChange={(key, value) => setCustomization(current => ({ ...current, [key]: value }))} />
          </div>
          {available === false && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">this product is currently out of stock.</p>}
          {configurationLoaded && !customizationConfigured && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">customization options are still unavailable. This product cannot be added yet.</p>}
          {configurationLoaded && customizationConfigured && <AddToCartButton
            product={{ id: product.id, name: product.name, price, imageUrl: activeMedia ? mediaUrl(activeMedia, 'thumb') : undefined, customization }}
            disabled={available === false || !customizationReady}
            disabledLabel={available === false ? 'out of stock' : 'complete required fields'}
          />}
        </div>
      </section>

      <ProductSuggestions products={suggestions.map(candidate => ({
        id: productPath(candidate),
        name: candidate.name,
        category: candidate.category,
        price: candidate.price,
        imageUrl: candidate.media[0] ? mediaUrl(candidate.media[0], 'thumb') : undefined,
      }))} onSelect={path => router.push(path)} />
      <StoreFooter />
    </main>
  );
}
