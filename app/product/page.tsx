'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { withBasePath } from '@/lib/config';
import { ProductDetailClient, type ProductDetailProduct } from './[slug]/ProductDetailClient';
import { fetchCatalogue } from '@/lib/catalogueClient';
import { localInventoryMaps } from '@/lib/localInventory';

function DatabaseProductPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('id');
  const [products, setProducts] = React.useState<ProductDetailProduct[] | null>(null);

  React.useEffect(() => {
    fetchCatalogue<ProductDetailProduct>()
      .then(catalogue => { const local=localInventoryMaps(); setProducts(catalogue.map(product=>({...product,...(local.prices[product.id]!=null?{price:local.prices[product.id]}:{}),...(local.availability[product.id]!=null?{active:local.availability[product.id]}:{}),...(local.customization[product.id]?{customizableProperties:local.customization[product.id]}:{})}) as ProductDetailProduct)); })
      .catch(() => setProducts([]));
  }, []);

  if (products === null) return <main className="min-h-screen bg-[#fbf7f2] px-5 py-20"><div className="mx-auto h-96 max-w-6xl animate-pulse rounded-3xl bg-[#e9e4db]" /></main>;
  const product = products.find(candidate => candidate.id === productId);
  if (!product) return <main className="flex min-h-screen flex-col items-center justify-center bg-[#fbf7f2] px-5 text-center"><h1 className="font-serif text-4xl">product not found</h1><Link href={withBasePath('/')} className="mt-5 rounded-full bg-[#2d2a26] px-5 py-3 text-sm font-bold text-white">back to catalogue</Link></main>;
  const suggestions = products.filter(candidate => candidate.id !== product.id).sort((left, right) => Number(right.category === product.category) - Number(left.category === product.category)).slice(0, 4);
  return <ProductDetailClient product={product} suggestions={suggestions} configurationPreloaded />;
}

export default function ProductPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#fbf7f2]" />}><DatabaseProductPage /></Suspense>;
}
