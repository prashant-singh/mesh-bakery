'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Instagram, MessageCircle, Play, X } from 'lucide-react';
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
  const [cardMediaIndices, setCardMediaIndices] = useState<Record<string, number>>({});
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({});

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

  const categories = ['all', 'toy', 'daily object', 'miniature', 'home'];
  const whatsappHref = (productName: string, productId: string) =>
    `https://wa.me/918460582729?text=${encodeURIComponent(`hi mesh bakery, i'd like to order the ${productName} (${productId}).`)}`;
  const instagramHref = 'https://www.instagram.com/meshbakeryprints/';
  const mediaKey = (productId: string, mediaIndex: number) => `${productId}-${mediaIndex}`;
  const isGif = (url: string) => /\.gif(\?|#|$)/i.test(url);
  const isVideo = (media: Media) => media.type === 'video';
  const isVisualImage = (media: Media) => media.type === 'image' || isGif(media.url);
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

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#ff6b35]/20">
      <header className="px-6 md:px-12 py-8 grid grid-cols-3 items-center">
        <div />

        <div className="flex items-center justify-center gap-3">
          <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center shrink-0">
            <div className="w-3 h-3 bg-white rounded-sm rotate-12" />
          </div>
          <span className="text-[clamp(1rem,4vw,1.25rem)] font-bold tracking-tight text-[#2d2a26] whitespace-nowrap">
            mesh bakery
          </span>
        </div>

        <div />
      </header>

      <main className="flex-1">
        <section className="px-6 md:px-12 pt-12 pb-12 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12 relative overflow-hidden md:overflow-visible">
          <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-[#e9e4db]/40 rounded-full blur-3xl -z-10" />
          <div className="max-w-md z-10">
            <h1 className="text-4xl md:text-3xl font-serif font-light text-[#2d2a26] mb-6 leading-[1.1]">
              freshly baked <span className="text-[#5b6346] italic whitespace-nowrap">prints.</span>
            </h1>
            <p className="text-[#3d3a36] opacity-60 text-base leading-relaxed">
              small-batch curiosities for shelves, desks, and adventures.
            </p>
          </div>
        </section>

        <section className="sticky top-0 z-30 bg-[#faf8f5]/85 backdrop-blur-md border-y border-[#e9e4db]/50">
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-3">
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
                  onClick={() => setSelectedProduct(item)}
                  className={`group flex flex-col rounded-[18px] overflow-hidden min-h-[390px] cursor-pointer ${bgClass}`}
                >
                  <div className="relative h-[70%] min-h-[260px]">
                    <div className="relative h-full w-full overflow-hidden bg-[#f8f4ee]">
                      {activeMedia ? (
                        isVideo(activeMedia) ? (
                          <>
                            <video
                              ref={(el) => {
                                videoRefs.current[activeMediaIdentifier] = el;
                              }}
                              src={activeMedia.url}
                              className="h-full w-full object-cover"
                              preload="metadata"
                              playsInline
                              controls={false}
                              onEnded={() => pauseVideo(activeMediaIdentifier)}
                              onPause={() => {
                                if (!videoRefs.current[activeMediaIdentifier]?.paused) return;
                                setPlayingVideos(current => ({ ...current, [activeMediaIdentifier]: false }));
                              }}
                            />
                            {!playingVideos[activeMediaIdentifier] && (
                              <button
                                type="button"
                                aria-label={`play video for ${item.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  playVideo(activeMediaIdentifier);
                                }}
                                className="absolute inset-0 z-10 flex items-center justify-center"
                              >
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#2d2a26] shadow-lg">
                                  <Play className="h-5 w-5 translate-x-0.5" />
                                </span>
                              </button>
                            )}
                          </>
                        ) : (
                          <Image
                            src={activeMedia.url}
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
                          className="h-8 w-8 rounded-full bg-white/80 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors shrink-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center gap-1.5 rounded-full bg-black/15 backdrop-blur px-2 py-1 w-fit pointer-events-none">
                          {mediaItems.map((_, imageIndex) => (
                            <span
                              key={imageIndex}
                              className={`h-1.5 rounded-full transition-all ${imageIndex === activeMediaIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
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
                          className="h-8 w-8 rounded-full bg-white/80 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors shrink-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="z-10 flex flex-col gap-2 p-4 pt-3 flex-1">
                    <div className="relative">
                      <h3 className="text-xl font-medium mb-1 leading-tight line-clamp-2">{item.name}</h3>
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

                    <div className="mt-auto h-1" />
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
            className="fixed inset-0 z-50 bg-[#faf8f5]/90 backdrop-blur-sm flex items-stretch justify-center p-0 md:p-8 overflow-hidden"
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
              className="w-full h-[100dvh] md:h-auto md:max-h-[92dvh] md:max-w-6xl bg-[#faf8f5] rounded-none md:rounded-[32px] overflow-hidden shadow-2xl border border-black/5 grid grid-rows-[minmax(240px,42vh)_1fr] md:grid-rows-none md:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] min-h-0"
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
                        <video
                          ref={(el) => {
                            videoRefs.current[mediaKey(selectedProduct.id, activeDetailMediaIndex)] = el;
                          }}
                          src={activeDetailMedia.url}
                          className="h-full w-full object-cover"
                          preload="metadata"
                          playsInline
                          controls={false}
                          onEnded={() => pauseVideo(mediaKey(selectedProduct.id, activeDetailMediaIndex))}
                          onPause={() => setPlayingVideos(current => ({ ...current, [mediaKey(selectedProduct.id, activeDetailMediaIndex)]: false }))}
                        />
                        {!playingVideos[mediaKey(selectedProduct.id, activeDetailMediaIndex)] && (
                          <button
                            type="button"
                            aria-label={`play video for ${selectedProduct.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              playVideo(mediaKey(selectedProduct.id, activeDetailMediaIndex));
                            }}
                            className="absolute inset-0 z-10 flex items-center justify-center"
                          >
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#2d2a26] shadow-lg">
                              <Play className="h-5 w-5 translate-x-0.5" />
                            </span>
                          </button>
                        )}
                      </>
                    ) : (
                      <Image
                        src={activeDetailMedia.url}
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
                          className="h-9 w-9 rounded-full bg-white/90 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors duration-150 shrink-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="relative flex-1 h-4">
                          <div className="absolute left-1/2 -translate-x-1/2 inline-flex items-center justify-center gap-1.5 rounded-full bg-black/15 backdrop-blur px-2 py-1 w-fit pointer-events-none">
                            {selectedProduct.media.filter(media => isVisualImage(media) || isVideo(media)).map((_, mediaIndex) => {
                              const activeDetailMediaIndex = cardMediaIndices[selectedProduct.id] ?? 0;
                              return (
                                <span
                                  key={mediaIndex}
                                  className={`h-1.5 rounded-full transition-all ${mediaIndex === activeDetailMediaIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
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
                          className="h-9 w-9 rounded-full bg-white/90 text-[#2d2a26] flex items-center justify-center border border-black/5 hover:bg-white transition-colors duration-150 shrink-0"
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
                className="w-full overflow-y-auto overscroll-contain min-h-0 px-6 py-6 md:px-8 md:py-8 flex flex-col bg-[#faf8f5]"
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
