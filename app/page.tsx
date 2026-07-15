"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { withBasePath } from "@/lib/config";
import { productPath } from "@/lib/productRoutes";
import {
  FeaturedAnnouncement,
  type FeaturedConfig,
} from "@/components/FeaturedAnnouncement";
import { fetchFeaturedConfig } from "@/lib/featuredConfig";
import { ProductTagChip, type ProductTag } from "@/components/ProductTagChip";
import { CatalogueFilters } from "@/components/CatalogueFilters";
import type { CustomizableProperty } from "@/components/CustomizationForm";
import { StoreFooter } from "@/components/StoreFooter";
import { localInventoryMaps } from "@/lib/localInventory";
import { fetchCatalogue } from "@/lib/catalogueClient";

type Media = {
  type: "image" | "video";
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
  shortDescription: string;
  description: string;
  customizableProperties?: CustomizableProperty[];
  active?: boolean;
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
      { rootMargin: "250px" },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [eager, shouldLoad]);

  return <video ref={videoRef} src={shouldLoad ? src : undefined} {...props} />;
}

export default function Page() {
  const router = useRouter();
  const [catalogue, setCatalogue] = React.useState<Product[]>([]);
  const [availability, setAvailability] = React.useState<
    Record<string, boolean>
  >({});
  const [filter, setFilter] = useState("all");
  const [cardMediaIndices, setCardMediaIndices] = useState<
    Record<string, number>
  >({});
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>(
    {},
  );
  const videoRefs = React.useRef<Record<string, HTMLVideoElement | null>>({});
  const cardSwipeState = React.useRef<
    Record<
      string,
      {
        startX: number;
        startY: number;
        swiped: boolean;
        pointerId: number | null;
      }
    >
  >({});
  const [featuredConfig, setFeaturedConfig] = useState<FeaturedConfig | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [heroVisibility, setHeroVisibility] = useState<Record<string, boolean>>(
    {},
  );
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, number>>(
    {},
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroDirection, setHeroDirection] = useState<1 | -1>(1);
  const [isHeroPaused, setIsHeroPaused] = useState(false);

  React.useEffect(() => {
    fetchCatalogue<Product>()
      .then((products) => {
        const local = localInventoryMaps();
        setCatalogue(products);
        setAvailability({ ...Object.fromEntries(products.map(product => [product.id, product.active !== false])), ...local.availability });
        setHeroVisibility({ ...Object.fromEntries(products.map(product => [product.id, product.featured === true])), ...local.featured });
        setProductOrder(local.order.length ? local.order : products.map(product => product.id));
        setProductPrices({ ...Object.fromEntries(products.map(product => [product.id, product.price])), ...local.prices });
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    fetchFeaturedConfig()
      .then((data) => setFeaturedConfig(data))
      .catch((err) => console.error("Failed to load featured config", err));
  }, []);

  const categories = [
    "all",
    "keychains",
    "desk toys",
    "bookmarks",
    "superheroes",
  ];
  const mediaKey = (productId: string, mediaIndex: number) =>
    `${productId}-${mediaIndex}`;
  const isGif = (url: string) => /\.gif(\?|#|$)/i.test(url);
  const isVideo = (media: Media) => media.type === "video";
  const isVisualImage = (media: Media) =>
    media.type === "image" || isGif(media.url);
  const getThumbSrc = (media: Media) =>
    withBasePath(media.thumbUrl ?? media.cardUrl ?? media.url);

  const getCardSrc = (media: Media) =>
    withBasePath(media.cardUrl ?? media.thumbUrl ?? media.url);

  const getDetailSrc = (media: Media) =>
    withBasePath(media.detailUrl ?? media.cardUrl ?? media.url);
  const getTagName = (tag: ProductTag) =>
    typeof tag === "string" ? tag : tag.name;
  const formatInr = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  const playVideo = (key: string) => {
    const video = videoRefs.current[key];
    if (!video) return;
    video.play().catch(() => undefined);
    setPlayingVideos((current) => ({ ...current, [key]: true }));
  };
  const pauseVideo = (key: string) => {
    const video = videoRefs.current[key];
    if (video) {
      video.pause();
    }
    setPlayingVideos((current) => ({ ...current, [key]: false }));
  };
  const orderedCatalogue = catalogue
    .map((product) =>
      productPrices[product.id] != null
        ? { ...product, price: productPrices[product.id] }
        : product,
    )
    .sort((left, right) => {
      const leftIndex = productOrder.indexOf(left.id);
      const rightIndex = productOrder.indexOf(right.id);
      return (
        (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
      );
    });
  const catalogueMaxPrice =
    orderedCatalogue.length > 0
      ? Math.max(...orderedCatalogue.map((product) => product.price))
      : 0;
  const activeMaxPrice = maxPriceFilter ?? catalogueMaxPrice;

  const filteredProducts = orderedCatalogue.filter((product) => {
    // 1. Filter by category tabs (Matches your existing category filter logic)
    const matchesCategory =
      filter === "all" ||
      product.category.toLowerCase() === filter.toLowerCase();

    // 2. Filter by search input text
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower) ||
      product.shortDescription?.toLowerCase().includes(searchLower) ||
      product.tags.some((tag) =>
        getTagName(tag).toLowerCase().includes(searchLower),
      );
    const matchesPrice = product.price <= activeMaxPrice;

    return matchesCategory && matchesSearch && matchesPrice;
  });
  const heroProducts = orderedCatalogue.filter(
    (product) => heroVisibility[product.id] === true,
  );
  const activeHeroProduct =
    heroProducts[heroIndex % Math.max(heroProducts.length, 1)];
  const activeHeroMedia = activeHeroProduct?.media.find(
    (media) => isVisualImage(media) || isVideo(media),
  );
  const moveHero = (direction: 1 | -1) => {
    if (heroProducts.length <= 1) return;
    setHeroDirection(direction);
    setHeroIndex(
      (current) =>
        (current + direction + heroProducts.length) % heroProducts.length,
    );
  };

  React.useEffect(() => {
    if (isHeroPaused || heroProducts.length <= 1) return;

    const timer = window.setInterval(() => {
      setHeroDirection(1);
      setHeroIndex((current) => current + 1);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [heroProducts.length, isHeroPaused]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf7f2] font-sans selection:bg-[#ff6b35]/20">
      <div
        className="overflow-hidden bg-[#2d2a26] py-2.5 text-sm font-bold text-white"
        aria-label="shipping offers"
      >
        <div className="shipping-marquee-track flex w-max items-center whitespace-nowrap">
          {[0, 1, 2, 3].map((copy) => (
            <div
              key={copy}
              className="flex items-center gap-12 pr-12"
              aria-hidden={copy > 0}
            >
              <span>🚀 Free shipping on orders over ₹499!</span>
              <span>
                🚚 Free Mini Flexi Toy on purchase of ₹599 &amp; above
              </span>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1">
        <div className="bg-[#fff1e4]">
          <header className="px-6 md:px-12 py-6 md:py-8 grid grid-cols-3 items-center">
            <div />
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <div className="w-8 h-8 bg-[#ff6b35] rounded-full flex items-center justify-center shrink-0">
                <div className="w-3 h-3 bg-white rounded-sm rotate-12" />
              </div>
              <span className="text-[clamp(1.5rem,6vw,1.875rem)] font-serif font-light tracking-[0.02em] text-[#2d2a26] whitespace-nowrap">
                mesh bakery
              </span>
            </div>
            <div className="flex justify-end">
              <Link
                href={withBasePath("/track")}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d8cbb8] bg-white/60 px-3 text-xs font-bold text-[#2d2a26] transition hover:bg-white md:px-4 md:text-sm"
              >
                <PackageSearch className="h-4 w-4" />
                <span className="hidden sm:inline">track order</span>
                <span className="sm:hidden">track</span>
              </Link>
            </div>
          </header>
          <section className="px-6 md:px-12 pt-2 md:pt-4 pb-10 max-w-6xl mx-auto relative overflow-hidden md:overflow-visible">
            <div className="absolute top-0 right-10 w-[400px] h-[400px] bg-[#e9e4db]/40 rounded-full blur-3xl -z-10" />

            <div className="flex flex-col gap-4 md:gap-5">
              {activeHeroProduct && (
                <section aria-label="fresh">
                  <div className="overflow-hidden rounded-[18px] border border-[#d8cbb8]/80 bg-[#fbf7f2]/45 p-1 shadow-[0_1px_0_rgba(255,255,255,0.75),0_16px_34px_rgba(45,42,38,0.06)]">
                    <AnimatePresence initial={false} mode="wait">
                      {activeHeroProduct && (
                        <motion.div
                          role="button"
                          tabIndex={0}
                          key={activeHeroProduct.id}
                          initial={{
                            opacity: 0,
                            x: heroDirection > 0 ? 96 : -96,
                          }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: heroDirection > 0 ? -96 : 96 }}
                          transition={{
                            duration: 0.13,
                            ease: [0.25, 1, 0.5, 1],
                          }}
                          onMouseEnter={() => setIsHeroPaused(true)}
                          onMouseLeave={() => setIsHeroPaused(false)}
                          onClick={() =>
                            router.push(productPath(activeHeroProduct))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(productPath(activeHeroProduct));
                            }
                          }}
                          className="group relative w-full text-left overflow-hidden rounded-[15px] bg-[#f0ebe3] min-h-[215px] md:min-h-[250px] grid md:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.8fr)] cursor-pointer transition-shadow duration-[250ms] hover:shadow-[0_14px_30px_rgba(45,42,38,0.12)]"
                        >
                          {heroProducts.length > 1 && (
                            <>
                              <button
                                type="button"
                                aria-label="previous fresh product"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveHero(-1);
                                }}
                                className="absolute left-3 md:left-4 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full bg-[#fbf7f2]/80 backdrop-blur border border-[#3d3a36]/10 text-[#2d2a26] shadow-sm flex items-center justify-center transition-colors hover:bg-[#fbf7f2]"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="next fresh product"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  moveHero(1);
                                }}
                                className="absolute right-3 md:right-4 top-1/2 z-20 h-9 w-9 -translate-y-1/2 rounded-full bg-[#fbf7f2]/80 backdrop-blur border border-[#3d3a36]/10 text-[#2d2a26] shadow-sm flex items-center justify-center transition-colors hover:bg-[#fbf7f2]"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <div className="relative min-h-[175px] md:min-h-[250px] overflow-hidden bg-[#e9e4db]">
                            {activeHeroMedia ? (
                              isVideo(activeHeroMedia) ? (
                                <LazyVideo
                                  src={getCardSrc(activeHeroMedia)}
                                  className="h-full w-full object-cover"
                                  preload="none"
                                  playsInline
                                  autoPlay
                                  muted
                                  loop
                                  controls={false}
                                />
                              ) : (
                                <Image
                                  src={getDetailSrc(activeHeroMedia)}
                                  alt={activeHeroProduct.name}
                                  fill
                                  priority
                                  className="object-cover transition-transform duration-[500ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.025]"
                                  sizes="(max-width: 768px) 100vw, 66vw"
                                />
                              )
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-sm text-[#3d3a36]/60">
                                no media available
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col justify-center gap-2 p-4 md:p-5 bg-[#fff1e4]">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#5b6346]">
                              fresh from the tray
                            </span>
                            <h3 className="text-2xl md:text-3xl font-serif font-light leading-tight text-[#2d2a26] line-clamp-2">
                              {activeHeroProduct.name}
                            </h3>
                            <p className="text-xs md:text-sm leading-relaxed text-[#3d3a36]/70 line-clamp-2">
                              {activeHeroProduct.shortDescription}
                            </p>
                            <div className="flex items-center justify-between gap-3 pt-1">
                              <p className="text-lg font-bold text-[#ff6b35]">
                                {formatInr(activeHeroProduct.price)}
                              </p>
                              <div className="flex items-center gap-1">
                                {heroProducts.map((product, index) => (
                                  <span
                                    key={product.id}
                                    className={`h-1.5 rounded-full transition-all ${index === heroIndex % heroProducts.length ? "w-6 bg-[#2d2a26]" : "w-2 bg-[#2d2a26]/20"}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>
              )}

              {featuredConfig?.enabled && (
                <section aria-label="featured">
                  <FeaturedAnnouncement config={featuredConfig} fullWidth />
                </section>
              )}
            </div>
          </section>
        </div>

        <div className="h-1 bg-gradient-to-b from-[#fff1e4] to-[#fbf7f2]" />
        <div className="bg-[#fbf7f2]">
          <section className="max-w-6xl mx-auto flex flex-col gap-8 px-6 py-8 md:flex-row md:px-12 md:pb-24">
            <CatalogueFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categories={categories}
              activeCategory={filter}
              onCategoryChange={setFilter}
              priceLimit={activeMaxPrice}
              maxPrice={catalogueMaxPrice}
              onPriceLimitChange={setMaxPriceFilter}
              resultCount={filteredProducts.length}
              searchPlaceholder="Search keychains, desk toys..."
            />

            <div className="min-w-0 flex-1">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-7 gap-y-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-11">
                  {filteredProducts.map((item, idx) => {
                    const bgs = [
                      "bg-[#f0ebe3] text-[#3d3a36]",
                      "bg-[#ff6b35] text-white",
                      "bg-[#2d2a26] text-[#faf8f5]",
                      "bg-[#5b6346] text-white",
                      "bg-[#e9e4db] text-[#3d3a36]",
                      "bg-[#d8d0c5] text-[#3d3a36]",
                    ];
                    const bgClass = bgs[idx % bgs.length];
                    const mediaItems = item.media.filter(
                      (media) => isVisualImage(media) || isVideo(media),
                    );
                    const activeMediaIndex = cardMediaIndices[item.id] ?? 0;
                    const activeMedia =
                      mediaItems[
                        activeMediaIndex % Math.max(mediaItems.length, 1)
                      ] ?? mediaItems[0];
                    const canCarousel = mediaItems.length > 1;
                    const activeMediaIdentifier = mediaKey(
                      item.id,
                      activeMediaIndex,
                    );

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
                          if (!state || state.pointerId !== event.pointerId)
                            return;
                          const deltaX = event.clientX - state.startX;
                          const deltaY = event.clientY - state.startY;
                          const isHorizontalSwipe =
                            Math.abs(deltaX) > 40 &&
                            Math.abs(deltaX) > Math.abs(deltaY);

                          if (isHorizontalSwipe) {
                            event.preventDefault();
                            setCardMediaIndices((current) => ({
                              ...current,
                              [item.id]:
                                deltaX < 0
                                  ? (activeMediaIndex + 1) % mediaItems.length
                                  : (activeMediaIndex - 1 + mediaItems.length) %
                                    mediaItems.length,
                            }));
                            cardSwipeState.current[item.id] = {
                              ...state,
                              swiped: true,
                            };
                          }
                        }}
                        onPointerCancel={() => {
                          if (!canCarousel) return;
                          delete cardSwipeState.current[item.id];
                        }}
                        onClick={() => {
                          if (cardSwipeState.current[item.id]?.swiped) {
                            cardSwipeState.current[item.id] = {
                              ...cardSwipeState.current[item.id],
                              swiped: false,
                            };
                            return;
                          }
                          router.push(productPath(item));
                        }}
                        style={
                          canCarousel ? { touchAction: "pan-y" } : undefined
                        }
                        className="group relative flex w-full max-w-[430px] justify-self-center flex-col rounded-[18px] overflow-visible min-h-[380px] cursor-pointer border border-[#d8cbb8]/70 bg-[#fbf7f2] transition duration-[250ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(45,42,38,0.11)] md:max-w-none md:justify-self-auto"
                      >
                        <ProductTagChip tags={item.tags} />
                        <div className="relative h-[80%] min-h-[300px] overflow-hidden rounded-t-[18px]">
                          <div
                            className={`relative h-full w-full overflow-hidden ${bgClass}`}
                          >
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
                                    onEnded={() =>
                                      pauseVideo(activeMediaIdentifier)
                                    }
                                    onPause={() => {
                                      if (
                                        !videoRefs.current[
                                          activeMediaIdentifier
                                        ]?.paused
                                      )
                                        return;
                                      setPlayingVideos((current) => ({
                                        ...current,
                                        [activeMediaIdentifier]: false,
                                      }));
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
                                    [item.id]:
                                      (activeMediaIndex -
                                        1 +
                                        mediaItems.length) %
                                      mediaItems.length,
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
                                    className={`h-1 rounded-full transition-all shadow-[0_1px_2px_rgba(0,0,0,0.2)] ${imageIndex === activeMediaIndex ? "w-3.5 bg-[#faf8f5]" : "w-1.5 bg-[#faf8f5]/60"}`}
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
                                    [item.id]:
                                      (activeMediaIndex + 1) %
                                      mediaItems.length,
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
                          <h3 className="text-xl font-serif font-light leading-snug line-clamp-1">
                            {item.name}
                          </h3>
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
                  Nothing baked with those filters yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <StoreFooter />

      <button
        type="button"
        aria-label="back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed right-5 bottom-24 z-[60] md:hidden h-10 w-10 rounded-full bg-[#2d2a26] text-[#faf8f5] shadow-lg flex items-center justify-center"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}
