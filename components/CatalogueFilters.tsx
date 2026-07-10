'use client';

import { Search, X } from 'lucide-react';

type CatalogueFiltersProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categories?: string[];
  activeCategory?: string;
  onCategoryChange?: (value: string) => void;
  priceLimit: number;
  maxPrice: number;
  onPriceLimitChange: (value: number) => void;
  resultCount: number;
  searchPlaceholder?: string;
};

export function CatalogueFilters({
  searchQuery,
  onSearchChange,
  categories,
  activeCategory,
  onCategoryChange,
  priceLimit,
  maxPrice,
  onPriceLimitChange,
  resultCount,
  searchPlaceholder = 'Search prints...',
}: CatalogueFiltersProps) {
  const normalizedMaxPrice = Math.max(maxPrice, 0);
  const normalizedPriceLimit = normalizedMaxPrice > 0 ? Math.min(priceLimit || normalizedMaxPrice, normalizedMaxPrice) : 0;
  const showCategories = Boolean(categories?.length && activeCategory && onCategoryChange);

  return (
    <aside className="w-full md:sticky md:top-6 md:w-56 md:shrink-0 md:self-start">
      <div className="flex flex-col gap-5 border-y border-[#e4d8c8] py-5 md:border-y-0 md:py-1">
        <div className="space-y-2">
          <label htmlFor="catalogue-search" className="text-[10px] font-bold uppercase tracking-widest text-[#3d3a36]/45">
            search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d3a36]/35" />
            <input
              type="text"
              name="catalogue-search"
              id="catalogue-search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="block w-full rounded-xl border border-[#d8cbb8] bg-white/72 py-2.5 pl-9 pr-9 text-sm text-[#2d2a26] placeholder-[#3d3a36]/35 shadow-sm focus:border-[#ff6b35] focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
              placeholder={searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#3d3a36]/35 transition-colors hover:text-[#2d2a26]"
                aria-label="clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {showCategories && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3d3a36]/45">
              category
            </p>
            <div className="flex flex-wrap gap-2 md:flex-col">
              {categories?.map(category => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCategoryChange?.(category)}
                  className={`rounded-full px-3 py-2 text-left text-xs font-bold tracking-widest transition-colors duration-150 md:w-full ${activeCategory === category ? 'bg-[#2d2a26] text-[#faf8f5]' : 'bg-[#e9e4db] text-[#2d2a26] hover:bg-[#d8d0c5]'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="catalogue-price" className="text-[10px] font-bold uppercase tracking-widest text-[#3d3a36]/45">
              price
            </label>
            <span className="text-xs font-bold text-[#ff6b35]">
              up to ₹{normalizedPriceLimit}
            </span>
          </div>
          <input
            type="range"
            id="catalogue-price"
            min={0}
            max={normalizedMaxPrice}
            step={10}
            value={normalizedPriceLimit}
            onChange={(event) => onPriceLimitChange(Number(event.target.value))}
            disabled={normalizedMaxPrice === 0}
            className="w-full accent-[#ff6b35]"
          />
        </div>

        <p className="text-xs text-[#3d3a36]/50">
          {resultCount} {resultCount === 1 ? 'item' : 'items'}
        </p>
      </div>
    </aside>
  );
}
