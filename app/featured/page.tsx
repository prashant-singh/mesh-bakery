'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Instagram, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BASE_PATH, withBasePath } from '@/lib/config';
import type { FeaturedConfig } from '@/components/FeaturedAnnouncement';
import { ProductTagChip, type ProductTag } from '@/components/ProductTagChip';

type Media = {
  type: 'image' | 'video';
  url: string;
  thumbUrl?: string;
  cardUrl?: string;
  detailUrl?: string;
  posterUrl?: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  media: Media[];
  tags: ProductTag[];
  price: number;
  size: string;
  shortDescription: string;
  description: string;
  featured?: boolean;
};

type LazyVideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  src: string;
  eager?: boolean;
};

function LazyVideo({ src, eager = false, ...props }: LazyVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [shouldLoad, setShouldLoad] = React.useState(eager);

  React.useEffect(() => {
    if (eager || shouldLoad) return;
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [eager, shouldLoad]);

  return <video ref={videoRef} src={shouldLoad ? src : undefined} {...props} />;
}

export default function FeaturedPage() {
  const [catalogue, setCatalogue] = React.useState<Product[]>([]);
  const [featuredConfig, setFeaturedConfig] = React.useState<FeaturedConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cardMediaIndices, setCardMediaIndices] = useState<Record<string, number>>({});
  const cardSwipeState = React.useRef<Record<string, { startX: number; startY: number; swiped: boolean; pointerId: number | null }>>({});
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({});

  React.useEffect(() => {
    fetch(`${BASE_PATH}/products.json?v=` + Date.now())
      .then(res => res.json())
      .then(data => setCatalogue(data))
      .catch(err => console.error('Failed to load products', err));
  }, []);

  React.useEffect(() => {
    fetch(`${BASE_PATH}/featured-config.json?v=` + Date.now())
      .then(res => res.json())
      .then(data => setFeaturedConfig(data))
      .catch(err => console.error('Failed to load featured config', err));
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

  React.useEffect(() => {
    if (!selectedProduct) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProduct]);

  const isGif = (url: string) => /\.gif(\?|#|$)/i.test(url);
  const isVideo = (media: Media) => media.type === 'video';
  const isVisualImage = (media: Media) => media.type === 'image' || isGif(media.url);
  const getThumbSrc = (media: Media) => withBasePath(media.thumbUrl ?? media.cardUrl ?? media.url);
  const getCardSrc = (media: Media) => withBasePath(media.cardUrl ?? media.thumbUrl ?? media.url);
  const getDetailSrc = (media: Media) => withBasePath(media.detailUrl ?? media.cardUrl ?? media.url);
  const mediaKey = (productId: string, mediaIndex: number) => `${productId}-${mediaIndex}`;
  const getTagName = (tag: ProductTag) => typeof tag === 'string' ? tag : tag.name;
  const instagramHref = 'https://www.instagram.com/meshbakeryprints/';
  const formatInr = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  const pauseVideo = (key: string) => {
    const video = videoRefs.current[key];
    if (video) {
      video.pause();
    }
  };

  const featuredProducts = catalogue.filter(product => product.featured === true);
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredProducts = featuredProducts.filter(product => {
    if (!searchLower) return true;

    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower) ||
      product.shortDescription?.toLowerCase().includes(searchLower) ||
      product.tags.some(tag => getTagName(tag).toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf7f2] font-sans selection:bg-[#ff6b35]/20">
      <main className="flex-1">
        <div className="bg-[#fff1e4]">
          <header className="px-6 md:px-12 py-6 md:py-8 grid grid-cols-3 items-center">
            <Link
              href={withBasePath('/')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#2d2a26] transition-colors hover:bg-[#e9e4db] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35]"
              aria-label="back to catalogue"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center shrink-0">
                <div className="w-3 h-3 bg-white rounded-sm rotate-12" />
              </div>
              <span className="text-[clamp(1.5rem,6vw,1.875rem)] font-serif font-light tracking-[0.02em] text-[#2d2a26] whitespace-nowrap">
                mesh bakery
              </span>
            </div>
            <div />
          </header>

          {featuredConfig?.enabled ? (
            <section className="max-w-6xl mx-auto px-6 md:px-12 pb-7">
              <div className="border-y border-[#d8cbb8] py-4 text-center text-sm leading-relaxed text-[#3d3a36]/78 md:text-base">
                {featuredConfig.largeDescription || featuredConfig.description}
              </div>
            </section>
          ) : null}
        </div>

        {featuredConfig?.enabled && featuredProducts.length > 0 ? (
          <section className="max-w-6xl mx-auto px-6 md:px-12 py-8">
            <div className="mx-auto w-full max-w-md relative">
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="featured-search"
                  id="featured-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-lg border border-[#d8cbb8] bg-white py-2 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="Search featured prints..."
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                    aria-label="clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="max-w-6xl mx-auto px-6 md:px-12 pb-24 pt-0">
          {featuredConfig?.enabled && featuredProducts.length > 0 ? (
            filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7 lg:gap-x-7 lg:gap-y-8">
                {filteredProducts.map((item, idx) => {
                  const bgs = [
                    'bg-[#f0ebe3] text-[#3d3a36]',
                    'bg-[#ff6b35] text-white',
                    'bg-[#2d2a26] text-[#faf8f5]',
                    'bg-[#5b6346] text-white',
                    'bg-[#e9e4db] text-[#3d3a36]',
                    'bg-[#d8d0c5] text-[#3d3a36]',
                  ];
                  const bgClass = bgs[idx % bgs.length];
                  const mediaItems = item.media.filter(media => isVisualImage(media) || isVideo(media));
                  const activeMediaIndex = cardMediaIndices[item.id] ?? 0;
                  const activeMedia = mediaItems[activeMediaIndex % Math.max(mediaItems.length, 1)] ?? mediaItems[0];
                  const canCarousel = mediaItems.length > 1;
                  const activeMediaIdentifier = mediaKey(item.id, activeMediaIndex);

                  return (
                    <motion.div
                      key={`${item.id}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: idx * 0.025 }}
                      onPointerDown={(event) => {
                        if (!canCarousel) return;
                        cardSwipeState.current[item.id] = {
                          startX: event.clientX,
                          startY: event.clientY,
                          swiped: false,
                          pointerId: event.pointerId,
                        };
                      }}
                      onPointerUp={(event) => {
                        if (!canCarousel) return;
                        const state = cardSwipeState.current[item.id];
                        if (!state || state.pointerId !== event.pointerId) return;
                        const deltaX = event.clientX - state.startX;
                        const deltaY = event.clientY - state.startY;
                        const isHorizontalSwipe = Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY);

                        if (isHorizontalSwipe) {
                          event.preventDefault();
                          setCardMediaIndices((current) => ({
                            ...current,
                            [item.id]: deltaX < 0
                              ? (activeMediaIndex + 1) % mediaItems.length
                              : (activeMediaIndex - 1 + mediaItems.length) % mediaItems.length,
                          }));
                          cardSwipeState.current[item.id] = { ...state, swiped: true };
                        }
                      }}
                      onPointerCancel={() => {
                        if (!canCarousel) return;
                        delete cardSwipeState.current[item.id];
                      }}
                      onClick={() => {
                        if (cardSwipeState.current[item.id]?.swiped) {
                          cardSwipeState.current[item.id] = { ...cardSwipeState.current[item.id], swiped: false };
                          return;
                        }
                        setSelectedProduct(item);
                      }}
                      style={canCarousel ? { touchAction: 'pan-y' } : undefined}
                      className="group relative flex flex-col rounded-[18px] overflow-visible min-h-[380px] cursor-pointer bg-[#fbf7f2] transition-shadow duration-[250ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[0_14px_36px_rgba(45,42,38,0.12)]"
                    >
                      <ProductTagChip tags={item.tags} />
                      <div className="relative h-[80%] min-h-[300px] overflow-hidden rounded-t-[18px]">
                        <div className={`relative h-full w-full overflow-hidden ${bgClass}`}>
                          {activeMedia ? (
                            isVideo(activeMedia) ? (
                              <LazyVideo
                                src={getCardSrc(activeMedia)}
                                className="h-full w-full object-cover"
                                preload="none"
                                playsInline
                                autoPlay
                                muted
                                loop
                                controls={false}
                                onEnded={() => pauseVideo(activeMediaIdentifier)}
                              />
                            ) : (
                              <Image
                                src={getCardSrc(activeMedia)}
                                alt={item.name}
                                fill
                                className="object-cover transition-transform duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03]"
                                referrerPolicy="no-referrer"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            )
                          ) : (
                            <Image
                              src="https://picsum.photos/seed/fallback/800/800"
                              alt={item.name}
                              fill
                              className="object-cover transition-transform duration-[350ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03]"
                              referrerPolicy="no-referrer"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          )}
                        </div>
                        {canCarousel && (
                          <div className="absolute inset-x-0 bottom-3 flex items-center justify-between gap-3 px-3">
                            <button
                              type="button"
                              aria-label={`previous image for ${item.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setCardMediaIndices((current) => ({
                                  ...current,
                                  [item.id]: (activeMediaIndex - 1 + mediaItems.length) % mediaItems.length,
                                }));
                              }}
                              className="h-8 w-8 text-white flex items-center justify-center transition-opacity transition-colors duration-150 shrink-0 opacity-100 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center gap-1 w-fit pointer-events-none opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
                              {mediaItems.map((_, imageIndex) => (
                                <span
                                  key={imageIndex}
                                  className={`h-1 rounded-full transition-all shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${imageIndex === activeMediaIndex ? 'w-3.5 bg-[#faf8f5]' : 'w-1.5 bg-[#faf8f5]/60'}`}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              aria-label={`next image for ${item.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setCardMediaIndices((current) => ({
                                  ...current,
                                  [item.id]: (activeMediaIndex + 1) % mediaItems.length,
                                }));
                              }}
                              className="h-8 w-8 text-white flex items-center justify-center transition-opacity transition-colors duration-150 shrink-0 opacity-100 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="z-10 flex min-h-[84px] flex-col gap-1 overflow-hidden rounded-b-[18px] bg-[#fbf7f2] bg-clip-padding px-4 pt-3 pb-4 text-[#3d3a36]">
                        <h3 className="text-xl font-serif font-light leading-snug line-clamp-1">{item.name}</h3>
                        <p className="text-sm leading-snug line-clamp-1 opacity-65 mt-0.5">
                          {item.shortDescription}
                        </p>
                        <p className="text-lg font-bold leading-none text-[#ff6b35] mt-2">
                          {formatInr(item.price)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#d8cbb8] bg-white/55 px-6 py-14 text-center text-[#3d3a36]/68">
                No featured items match your search.
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-[#d8cbb8] bg-white/55 px-6 py-14 text-center text-[#3d3a36]/68">
              No featured collection is currently available.
            </div>
          )}
        </section>
      </main>

      <footer className="w-full bg-slate-900 text-slate-400 py-8 mt-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs">
            &copy; {new Date().getFullYear()} MeshBakery
          </div>
          <a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition-colors group text-sm"
            aria-label="Follow us on Instagram"
          >
            <Instagram className="h-4 w-4 text-slate-400 group-hover:text-pink-500 transition-colors" />
            <span className="font-medium">Instagram</span>
          </a>
        </div>
      </footer>

      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#fbf7f2]/90 backdrop-blur-sm flex items-stretch justify-center md:items-center p-0 md:p-8 overflow-hidden"
            onClick={() => setSelectedProduct(null)}
          >
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-12 h-12 rounded-full bg-white/70 backdrop-blur border border-[#3d3a36]/10 flex items-center justify-center hover:bg-white transition-colors duration-150 shadow-sm text-[#2d2a26]"
              aria-label="close product details"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.04, duration: 0.18 }}
              className="w-full h-[100dvh] md:h-auto md:min-h-[60dvh] md:max-h-[calc(100dvh-4rem)] md:max-w-6xl md:self-center bg-[#fbf7f2] rounded-none md:rounded-[32px] overflow-hidden shadow-2xl border border-black/5 grid grid-rows-[minmax(240px,42vh)_1fr] md:grid-rows-none md:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] min-h-0"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-4 sm:p-5 md:p-6 bg-[#f3eee6] flex flex-col gap-4 min-h-0">
                <div className="relative rounded-[26px] overflow-hidden bg-[#e9e4db] h-full min-h-[240px]">
                  {(() => {
                    const detailMedia = selectedProduct.media.filter(media => isVisualImage(media) || isVideo(media));
                    const activeDetailMediaIndex = cardMediaIndices[selectedProduct.id] ?? 0;
                    const activeDetailMedia = detailMedia[activeDetailMediaIndex % Math.max(detailMedia.length, 1)];

                    if (!activeDetailMedia) {
                      return (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#3d3a36]/60">
                          no media available
                        </div>
                      );
                    }

                    return isVideo(activeDetailMedia) ? (
                      <LazyVideo
                        src={getDetailSrc(activeDetailMedia)}
                        eager
                        className="h-full w-full object-cover"
                        preload="metadata"
                        playsInline
                        autoPlay
                        muted
                        loop
                        controls={false}
                        onEnded={() => pauseVideo(mediaKey(selectedProduct.id, activeDetailMediaIndex))}
                      />
                    ) : (
                      <Image
                        src={getDetailSrc(activeDetailMedia)}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        sizes="(max-width: 768px) 100vw, 60vw"
                      />
                    );
                  })()}
                </div>
              </div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ delay: 0.075, duration: 0.18 }}
                className="w-full overflow-y-auto overscroll-contain min-h-0 px-6 py-6 md:px-8 md:py-8 flex flex-col bg-[#fbf7f2]"
              >
                <div className="max-w-md mx-auto w-full">
                  <div className="mb-3">
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-50">{selectedProduct.category}</span>
                  </div>

                  <h2 className="text-3xl md:text-5xl font-serif font-light text-[#2d2a26] mb-3 leading-tight">
                    {selectedProduct.name}
                  </h2>

                  <div className="font-mono text-lg md:text-xl mb-5 text-[#ff6b35]">
                    {formatInr(selectedProduct.price)}
                  </div>

                  <p className="text-base text-[#3d3a36] opacity-80 leading-relaxed mb-6">
                    {selectedProduct.description}
                  </p>

                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full bg-[#2d2a26] text-[#faf8f5] h-14 rounded-full flex items-center justify-center gap-2 text-sm font-bold tracking-widest hover:bg-[#1f1c19] transition-colors duration-150"
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
