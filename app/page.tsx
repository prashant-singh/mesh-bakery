'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Instagram, MessageCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type Media = {
  type: 'image' | 'video';
  url: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  media: Media[];
  tags: string[];
  price: number;
  size: string;
  description: string;
};

export default function Page() {
  const [catalogue, setCatalogue] = React.useState<Product[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});

  React.useEffect(() => {
    fetch('/products.json?v=' + Date.now())
      .then(res => res.json())
      .then(data => setCatalogue(data))
      .catch(err => console.error('Failed to load products', err));
  }, []);

  React.useEffect(() => {
    if (!selectedProduct) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedProduct(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProduct]);

  const filtered = filter === 'all'
    ? catalogue
    : catalogue.filter(item => item.category === filter);

  const categories = ['all', 'toy', 'daily object', 'miniature', 'home'];
  const whatsappHref = (productName: string, productId: string) =>
    `https://wa.me/918460582729?text=${encodeURIComponent(`hi mesh bakery, i'd like to order the ${productName} (${productId}).`)}`;
  const instagramHref = 'https://www.instagram.com/meshbakeryprints/';

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#ff6b35]/20">
      <header className="px-6 md:px-12 py-8 grid grid-cols-3 items-center">
        <div />

        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center shrink-0">
            <div className="w-3 h-3 bg-white rounded-sm rotate-12" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#2d2a26]">
            mesh bakery
          </span>
        </div>

        <div />
      </header>

      <main className="flex-1">
        <section className="px-6 md:px-12 pt-12 pb-20 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12 relative overflow-hidden md:overflow-visible">
          <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-[#e9e4db]/40 rounded-full blur-3xl -z-10" />
          <div className="max-w-md z-10">
            <h1 className="text-4xl md:text-3xl font-serif font-light text-[#2d2a26] mb-6 leading-[1.1]">
              freshly baked <span className="text-[#5b6346] italic whitespace-nowrap">prints.</span>
            </h1>
            <p className="text-[#3d3a36] opacity-60 text-l leading-relaxed">
              small-batch curiosities for shelves, desks, and adventures.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 z-10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-colors ${filter === cat ? 'bg-[#2d2a26] text-[#faf8f5]' : 'bg-[#e9e4db] text-[#2d2a26] hover:bg-[#d8d0c5]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
            {filtered.map((item, idx) => {
              const bgs = [
                'bg-[#f0ebe3] text-[#3d3a36]',
                'bg-[#ff6b35] text-white',
                'bg-[#2d2a26] text-[#faf8f5]',
                'bg-[#5b6346] text-white',
                'bg-[#e9e4db] text-[#3d3a36]',
                'bg-[#d8d0c5] text-[#3d3a36]',
              ];
              const bgClass = bgs[idx % bgs.length];
              const isDark = bgClass.includes('text-white') || bgClass.includes('text-[#faf8f5]');
              const imageMedia = item.media.filter(media => media.type === 'image');
              const activeImageIndex = cardImageIndices[item.id] ?? 0;
              const activeImage = imageMedia[activeImageIndex % Math.max(imageMedia.length, 1)] ?? imageMedia[0];
              const canCarousel = imageMedia.length > 1;

              return (
                <motion.div
                  key={`${item.id}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  onClick={() => setSelectedProduct(item)}
                  className={`group flex flex-col rounded-[18px] overflow-hidden min-h-[390px] cursor-pointer ${bgClass}`}
                >
                  <div className="relative h-[70%] min-h-[260px]">
                    <div className="relative h-full w-full overflow-hidden bg-[#f8f4ee]">
                      <Image
                        src={activeImage?.url || 'https://picsum.photos/seed/fallback/800/800'}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03]"
                        referrerPolicy="no-referrer"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    {canCarousel && (
                      <div className="absolute inset-x-0 bottom-3 flex items-center justify-between gap-3 px-3">
                        <button
                          type="button"
                          aria-label={`previous image for ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCardImageIndices((current) => ({
                              ...current,
                              [item.id]: (activeImageIndex - 1 + imageMedia.length) % imageMedia.length,
                            }));
                          }}
                          className="h-8 w-8 rounded-full bg-white/80 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors shrink-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center gap-1.5 rounded-full bg-black/15 backdrop-blur px-2 py-1 w-fit pointer-events-none">
                          {imageMedia.map((_, imageIndex) => (
                            <span
                              key={imageIndex}
                              className={`h-1.5 rounded-full transition-all ${imageIndex === activeImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          aria-label={`next image for ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setCardImageIndices((current) => ({
                              ...current,
                              [item.id]: (activeImageIndex + 1) % imageMedia.length,
                            }));
                          }}
                          className="h-8 w-8 rounded-full bg-white/80 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors shrink-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="z-10 flex flex-col gap-2 p-4 pt-3 flex-1">
                    <div className="relative">
                      <h3 className="text-xl font-medium mb-1 leading-tight">{item.name}</h3>
                      <p className={`text-sm ${isDark ? 'opacity-70' : 'opacity-50'}`}>{item.category}</p>
                    </div>

                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map(tag => (
                          <span
                            key={tag}
                            className={`px-2.5 py-1 text-[10px] font-bold tracking-widest rounded-full ${isDark ? 'bg-white/20 text-white' : 'bg-white/60 text-[#2d2a26]'}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto h-2" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="px-6 md:px-12 py-8 flex justify-between items-center border-t border-[#e9e4db]/50">
        <span className="text-xs font-bold tracking-widest text-[#3d3a36] opacity-40">
          mesh bakery
        </span>
      </footer>

      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#faf8f5]/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 overflow-hidden"
            onClick={() => setSelectedProduct(null)}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-12 h-12 rounded-full bg-white/70 backdrop-blur border border-[#3d3a36]/10 flex items-center justify-center hover:bg-white transition-colors shadow-sm text-[#2d2a26]"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.08, duration: 0.35 }}
              className="w-full max-w-6xl max-h-[92dvh] bg-[#faf8f5] rounded-[32px] overflow-hidden shadow-2xl border border-black/5 grid md:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-4 sm:p-5 md:p-6 bg-[#f3eee6] flex flex-col gap-4">
                <div className="relative rounded-[26px] overflow-hidden bg-[#e9e4db] aspect-[4/3]">
                  {selectedProduct.media.filter(media => media.type === 'image').length > 0 ? (() => {
                    const detailImages = selectedProduct.media.filter(media => media.type === 'image');
                    const activeDetailImageIndex = cardImageIndices[selectedProduct.id] ?? 0;
                    const activeDetailImage = detailImages[activeDetailImageIndex % detailImages.length];

                    return (
                      <Image
                        src={activeDetailImage?.url || 'https://picsum.photos/seed/fallback/800/800'}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        sizes="(max-width: 768px) 100vw, 60vw"
                      />
                    );
                  })() : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-[#3d3a36]/60">
                      no images available
                    </div>
                  )}
                </div>

                {selectedProduct.media.filter(media => media.type === 'image').length > 1 && (
                  <div className="flex items-center justify-between gap-3 px-1">
                    <button
                      type="button"
                      aria-label={`previous image for ${selectedProduct.name}`}
                      onClick={() => {
                        const detailImages = selectedProduct.media.filter(media => media.type === 'image');
                        setCardImageIndices(current => ({
                          ...current,
                          [selectedProduct.id]: ((current[selectedProduct.id] ?? 0) - 1 + detailImages.length) % detailImages.length,
                        }));
                      }}
                      className="h-9 w-9 rounded-full bg-white/90 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors shrink-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="relative flex-1 h-4">
                      <div className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center gap-1.5 rounded-full bg-black/15 backdrop-blur px-2 py-1 w-fit pointer-events-none">
                        {selectedProduct.media.filter(media => media.type === 'image').map((_, imageIndex) => {
                          const activeDetailImageIndex = cardImageIndices[selectedProduct.id] ?? 0;
                          return (
                            <span
                              key={imageIndex}
                              className={`h-1.5 rounded-full transition-all ${imageIndex === activeDetailImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label={`next image for ${selectedProduct.name}`}
                      onClick={() => {
                        const detailImages = selectedProduct.media.filter(media => media.type === 'image');
                        setCardImageIndices(current => ({
                          ...current,
                          [selectedProduct.id]: ((current[selectedProduct.id] ?? 0) + 1) % detailImages.length,
                        }));
                      }}
                      className="h-9 w-9 rounded-full bg-white/90 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors shrink-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ delay: 0.15, duration: 0.35 }}
                className="w-full max-h-[92dvh] overflow-y-auto px-6 py-6 md:px-8 md:py-8 flex flex-col bg-[#faf8f5]"
              >
                <div className="max-w-md mx-auto w-full">
                  <div className="flex gap-3 mb-5 flex-wrap">
                    {selectedProduct.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-[#2d2a26] text-[#faf8f5] text-[10px] font-bold tracking-widest rounded-full">
                        {tag}
                      </span>
                    ))}
                    <span className="px-3 py-1 bg-[#d8d0c5] text-[#3d3a36] text-[10px] font-bold tracking-widest rounded-full">
                      {selectedProduct.category}
                    </span>
                  </div>

                  <h2 className="text-3xl md:text-5xl font-serif font-light text-[#2d2a26] mb-3 leading-tight">
                    {selectedProduct.name}
                  </h2>

                  <div className="font-mono text-lg md:text-xl mb-5">
                    ${selectedProduct.price.toFixed(2)}
                  </div>

                  <p className="text-base text-[#3d3a36] opacity-80 leading-relaxed mb-6">
                    {selectedProduct.description}
                  </p>

                  <div className="border-y border-[#e9e4db] py-5 mb-8 flex flex-col gap-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-sm font-bold opacity-50 tracking-widest">size</span>
                      <span className="text-sm font-mono opacity-80 text-right">{selectedProduct.size}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm font-bold opacity-50 tracking-widest">material</span>
                      <span className="text-sm font-mono opacity-80 text-right">plant-based pla</span>
                    </div>
                  </div>

                  <a
                    href={whatsappHref(selectedProduct.name, selectedProduct.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25d366] text-white h-14 rounded-full flex items-center justify-center gap-2 text-sm font-bold tracking-widest hover:bg-[#1fb85a] transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    order via whatsapp
                  </a>

                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full bg-[#2d2a26] text-[#faf8f5] h-14 rounded-full flex items-center justify-center gap-2 text-sm font-bold tracking-widest hover:bg-[#1f1c19] transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    dm on instagram
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
