'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Instagram, MessageCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

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
  tags: string[];
  price: number;
  size: string;
  shortDescription: string;
  description: string;
};

type OfferBanner = {
  id: string;
  text: string;
  link?: string;
  linkText?: string;
  variant?: 'primary' | 'secondary' | 'alert'; // Add your options here
  isActive: boolean;
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

export default function Page() {
  const [catalogue, setCatalogue] = React.useState<Product[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cardMediaIndices, setCardMediaIndices] = useState<Record<string, number>>({});
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({});
  const cardSwipeState = React.useRef<Record<string, { startX: number; startY: number; swiped: boolean; pointerId: number | null }>>({});
  // ---> PASTE THE NEW STATES RIGHT HERE <---
  const [offers, setOffers] = useState<OfferBanner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    fetch('/products.generated.json?v=' + Date.now())
      .then(res => res.json())
      .then(data => setCatalogue(data))
      .catch(() => {
        fetch('/products.json?v=' + Date.now())
          .then(res => res.json())
          .then(data => setCatalogue(data))
          .catch(err => console.error('Failed to load products', err));
      });
  }, []);

  // This is the new offers fetch
  React.useEffect(() => {
    fetch('/offer.json?v=' + Date.now())
      .then(res => res.json())
      .then(data => setOffers(data))
      .catch(err => console.error('Failed to load offer banners', err));
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

  const filtered = filter === 'all'
    ? catalogue
    : catalogue.filter(item => item.category === filter);

  const categories = ['all', 'keychains', 'desk toys', 'bookmarks', 'superheroes'];
  const whatsappHref = (productName: string, productId: string) =>
    `https://wa.me/918460582729?text=${encodeURIComponent(`hi mesh bakery, i'd like to order the ${productName} (${productId}).`)}`;
  const instagramHref = 'https://www.instagram.com/meshbakeryprints/';
  const mediaKey = (productId: string, mediaIndex: number) => `${productId}-${mediaIndex}`;
  const isGif = (url: string) => /\.gif(\?|#|$)/i.test(url);
  const isVideo = (media: Media) => media.type === 'video';
  const isVisualImage = (media: Media) => media.type === 'image' || isGif(media.url);
  const getThumbSrc = (media: Media) => media.thumbUrl ?? media.cardUrl ?? media.url;
  const getCardSrc = (media: Media) => media.cardUrl ?? media.thumbUrl ?? media.url;
  const getDetailSrc = (media: Media) => media.detailUrl ?? media.cardUrl ?? media.url;
  const formatInr = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  const playVideo = (key: string) => {
    const video = videoRefs.current[key];
    if (!video) return;
    video.play().catch(() => undefined);
    setPlayingVideos(current => ({ ...current, [key]: true }));
  };
  const pauseVideo = (key: string) => {
    const video = videoRefs.current[key];
    if (video) {
      video.pause();
    }
    setPlayingVideos(current => ({ ...current, [key]: false }));
  };

  const filteredProducts = catalogue.filter((product) => {
    // 1. Filter by category tabs (Matches your existing category filter logic)
    const matchesCategory = filter === 'all' || product.category.toLowerCase() === filter.toLowerCase();

    // 2. Filter by search input text
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower) ||
      product.shortDescription?.toLowerCase().includes(searchLower) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchLower));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf7f2] font-sans selection:bg-[#ff6b35]/20">
      <header className="px-6 md:px-12 py-6 md:py-8 grid grid-cols-3 items-center">
        <div />
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center shrink-0">
            <div className="w-3 h-3 bg-white rounded-sm rotate-12" />
          </div>
          <span className="text-[clamp(1rem,4vw,1.25rem)] font-serif font-light tracking-[0.02em] text-[#2d2a26] whitespace-nowrap">
            mesh bakery
          </span>
        </div>

      </header>
      <div className="w-full flex flex-col">
        {offers
          .filter(offer => offer.isActive)
          .map((offer) => {
            // Inside your offers.map() loop:
            const variantStyles: { [key: string]: string } = {
              primary: "bg-gradient-to-r from-amber-500 to-orange-600 border-orange-700/30 text-white",
              secondary: "bg-slate-900 border-slate-800 text-slate-100",
              alert: "bg-gradient-to-r from-red-600 to-rose-700 border-rose-800 text-white"
            };

            // Now TypeScript will happily allow this lookup:
            const currentStyle = variantStyles[offer.variant || 'primary'] || variantStyles.primary;

            return (
              <div
                key={offer.id}
                className={`relative w-full px-4 py-2 text-center text-sm font-medium z-50 border-b last:border-b-0 ${currentStyle}`}
              >
                <div className="flex items-center justify-center gap-2 flex-wrap pr-8">
                  <span>{offer.text}</span>
                  {offer.link && (
                    <a
                      href={offer.link}
                      className="underline underline-offset-4 opacity-90 hover:opacity-100 transition-opacity font-semibold"
                    >
                      {offer.linkText || "View Offer"} &rarr;
                    </a>
                  )}
                </div>
              </div>
            );
          })}
      </div>


      <div className="w-full max-w-md mx-auto my-6 px-4 relative">
        <div className="relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" />
            </svg>
          </div>
          <input
            type="text"
            name="search"
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Search for keychain, desk toys & bookmarks..."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown Popup */}
        {searchQuery.trim().length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto z-50 divide-y divide-slate-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product); // Opens the product overview modal you already have!
                    setSearchQuery('');          // Resets the search bar
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  {/* Thumbnail Preview */}
                  {product.media && product.media[0] && product.media[0].type === 'image' && (
                    <Image
                      src={getThumbSrc(product.media[0])}
                      alt={product.name}
                      width={40}
                      height={40}
                      loading="lazy"
                      className="w-10 h-10 object-cover rounded bg-slate-100 flex-shrink-0"
                    />
                  )}

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">{product.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{product.shortDescription}</p>
                  </div>

                  {/* Price tag */}
                  <div className="text-xs font-bold text-orange-600 whitespace-nowrap">
                    ₹{product.price}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-slate-500">
                No matching items found.
              </div>
            )}
          </div>
        )}
      </div>





      <main className="flex-1">
        <section className="px-6 md:px-12 pt-8 md:pt-12 pb-12 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8 md:gap-12 relative overflow-hidden md:overflow-visible">
          <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-[#e9e4db]/40 rounded-full blur-3xl -z-10" />
          <div className="max-w-md z-10">
            <h1 className="text-4xl md:text-3xl font-serif font-light text-[#2d2a26] mb-6 leading-[1.1]">
              freshly baked <span className="text-[#5b6346] italic whitespace-nowrap">prints.</span>
            </h1>
            <p className="text-[#3d3a36] opacity-60 text-base leading-relaxed">
              small-batch curiosities for shelves, desks, and adventures.
            </p>
          </div>

          <div className="hidden md:flex flex-wrap gap-2 z-10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-colors duration-150 ${filter === cat ? 'bg-[#2d2a26] text-[#faf8f5]' : 'bg-[#e9e4db] text-[#2d2a26] hover:bg-[#d8d0c5]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="sticky top-0 z-30 md:hidden bg-[#fbf7f2]">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-colors duration-150 ${filter === cat ? 'bg-[#2d2a26] text-[#faf8f5]' : 'bg-[#e9e4db] text-[#2d2a26] hover:bg-[#d8d0c5]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-12 pb-24 pt-4 md:pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7 lg:gap-x-7 lg:gap-y-8">
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
                  className="group flex flex-col rounded-[18px] overflow-hidden min-h-[380px] cursor-pointer bg-[#fbf7f2] transition-shadow duration-[250ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:shadow-[0_14px_36px_rgba(45,42,38,0.12)]"
                >
                  <div className="relative h-[80%] min-h-[300px]">
                    <div className={`relative h-full w-full overflow-hidden ${bgClass}`}>
                      {activeMedia ? (
                        isVideo(activeMedia) ? (
                          <>
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
                              onPause={() => {
                                if (!videoRefs.current[activeMediaIdentifier]?.paused) return;
                                setPlayingVideos(current => ({ ...current, [activeMediaIdentifier]: false }));
                              }}
                            />
                          </>
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

                  <div className="z-10 flex min-h-[84px] flex-col gap-1 px-4 pt-3 pb-4 overflow-hidden bg-[#fbf7f2] text-[#3d3a36] bg-clip-padding">
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
        </section>
      </main>

      <footer className="w-full bg-slate-900 text-slate-400 py-8 mt-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Copyright text */}
          <div className="text-xs">
            &copy; {new Date().getFullYear()} MeshBakery
          </div>

          {/* Navigation Links & Socials */}
          <div className="flex items-center gap-6 text-sm">
            {/* Return Policy Link */}
            <a
              href="/return-policy"
              className="hover:text-white transition-colors underline underline-offset-4 decoration-slate-700 hover:decoration-white"
            >
              Return Policy
            </a>

            {/* Vertical Separator */}
            <span className="h-4 w-px bg-slate-800 hidden sm:block" />

            {/* Instagram Page Link */}
            <a
              href="https://www.instagram.com/meshbakeryprints/" // Replace with your actual handle url
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors group"
              aria-label="Follow us on Instagram"
            >
              <Instagram className="h-4 w-4 text-slate-400 group-hover:text-pink-500 transition-colors" />
              <span className="font-medium">Instagram</span>
            </a>
          </div>

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
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-12 h-12 rounded-full bg-white/70 backdrop-blur border border-[#3d3a36]/10 flex items-center justify-center hover:bg-white transition-colors duration-150 shadow-sm text-[#2d2a26]"
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
                      <>
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
                          onPause={() => setPlayingVideos(current => ({ ...current, [mediaKey(selectedProduct.id, activeDetailMediaIndex)]: false }))}
                        />
                      </>
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
                  {(() => {
                    const detailMedia = selectedProduct.media.filter(media => isVisualImage(media) || isVideo(media));
                    return detailMedia.length > 1;
                  })() && (
                      <>
                        <div className="absolute inset-x-0 bottom-3 flex items-center justify-between gap-3 px-3">
                          <button
                            type="button"
                            aria-label={`previous media for ${selectedProduct.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              const detailMedia = selectedProduct.media.filter(media => isVisualImage(media) || isVideo(media));
                              setCardMediaIndices(current => ({
                                ...current,
                                [selectedProduct.id]: ((current[selectedProduct.id] ?? 0) - 1 + detailMedia.length) % detailMedia.length,
                              }));
                            }}
                            className="h-9 w-9 text-white flex items-center justify-center transition-colors duration-150 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>

                          <div className="relative flex-1 h-4">
                            <div className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center gap-1 w-fit pointer-events-none">
                              {selectedProduct.media.filter(media => isVisualImage(media) || isVideo(media)).map((_, mediaIndex) => {
                                const activeDetailMediaIndex = cardMediaIndices[selectedProduct.id] ?? 0;
                                return (
                                  <span
                                    key={mediaIndex}
                                    className={`h-1 rounded-full transition-all shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${mediaIndex === activeDetailMediaIndex ? 'w-3.5 bg-[#faf8f5]' : 'w-1.5 bg-[#faf8f5]/60'}`}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label={`next media for ${selectedProduct.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              const detailMedia = selectedProduct.media.filter(media => isVisualImage(media) || isVideo(media));
                              setCardMediaIndices(current => ({
                                ...current,
                                [selectedProduct.id]: ((current[selectedProduct.id] ?? 0) + 1) % detailMedia.length,
                              }));
                            }}
                            className="h-9 w-9 text-white flex items-center justify-center transition-colors duration-150 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
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

                  {/* <div className="border-y border-[#e9e4db] py-5 mb-8 flex flex-col gap-3">
                    <div className="flex justify-between gap-4">
                      <span className="text-sm font-bold opacity-50 tracking-widest">size</span>
                      <span className="text-sm font-mono opacity-80 text-right">{selectedProduct.size}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm font-bold opacity-50 tracking-widest">material</span>
                      <span className="text-sm font-mono opacity-80 text-right">plant-based pla</span>
                    </div>
                  </div> */}

                  <a
                    href={whatsappHref(selectedProduct.name, selectedProduct.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25d366] text-white h-14 rounded-full flex items-center justify-center gap-2 text-sm font-bold tracking-widest hover:bg-[#1fb85a] transition-colors duration-150"
                  >
                    <MessageCircle className="h-4 w-4" />
                    order via whatsapp
                  </a>

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
