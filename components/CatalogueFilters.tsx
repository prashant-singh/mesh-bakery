'use client';

import { useState } from 'react';
import { SlidersHorizontal, Search, X } from 'lucide-react';

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
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const normalizedMaxPrice = Math.max(maxPrice, 0);
  const normalizedPriceLimit = normalizedMaxPrice > 0 ? Math.min(priceLimit || normalizedMaxPrice, normalizedMaxPrice) : 0;
  const showCategories = Boolean(categories?.length && activeCategory && onCategoryChange);
  const hasShelfFilter = Boolean(showCategories && activeCategory && activeCategory !== 'all');
  const hasBudgetFilter = normalizedMaxPrice > 0 && normalizedPriceLimit < normalizedMaxPrice;
  const activeFilterCount = (hasShelfFilter ? 1 : 0) + (hasBudgetFilter ? 1 : 0);
  const filterSummary = `${resultCount} ${resultCount === 1 ? 'print' : 'prints'} on the tray`;

  const renderFilterControls = (idSuffix: string) => (
    <>
      {showCategories && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3d3a36]/42">
            shelf
          </p>
          <div className="flex flex-wrap gap-2 md:flex-col md:gap-1.5">
            {categories?.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange?.(category)}
                className={`rounded-full px-3 py-2 text-left text-xs font-bold tracking-widest transition-none md:w-full ${activeCategory === category ? 'bg-[#2d2a26] text-[#faf8f5] shadow-sm' : 'bg-transparent text-[#2d2a26]/72 hover:bg-[#e9e4db]'}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`catalogue-price-${idSuffix}`} className="text-[10px] font-bold uppercase tracking-widest text-[#3d3a36]/45">
            budget
          </label>
          <span className="text-xs font-bold text-[#ff6b35]">
            up to ₹{normalizedPriceLimit}
          </span>
        </div>
        <input
          type="range"
          id={`catalogue-price-${idSuffix}`}
          min={0}
          max={normalizedMaxPrice}
          step={10}
          value={normalizedPriceLimit}
          onChange={(event) => onPriceLimitChange(Number(event.target.value))}
          disabled={normalizedMaxPrice === 0}
          className="w-full accent-[#ff6b35]"
        />
      </div>
    </>
  );

  return (
    <aside className="w-full md:sticky md:top-6 md:w-56 md:shrink-0 md:self-start">
      <div className="flex flex-col gap-4 border-y border-[#e4d8c8] py-5 md:gap-5 md:border-y-0 md:border-r md:border-[#e4d8c8] md:py-1 md:pr-6">
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
              className="block w-full rounded-xl border border-[#d8cbb8] bg-white/68 py-2.5 pl-9 pr-9 text-sm text-[#2d2a26] placeholder-[#3d3a36]/35 shadow-[0_1px_0_rgba(255,255,255,0.65)] focus:border-[#ff6b35] focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
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

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(current => !current)}
            className="flex w-full items-center justify-between rounded-xl border border-[#d8cbb8] bg-[#e9e4db]/62 px-3 py-2.5 text-xs font-bold tracking-widest text-[#2d2a26] transition-colors hover:bg-[#d8d0c5]"
            aria-expanded={isMobileFiltersOpen}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[#ff6b35] px-1.5 py-0.5 text-[10px] leading-none text-white">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <span className="text-[11px] font-semibold tracking-normal text-[#3d3a36]/55">
              {filterSummary}
            </span>
          </button>

          <div className={`grid transition-[grid-template-rows,opacity] duration-200 ${isMobileFiltersOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-5 pt-4">
                {renderFilterControls('mobile')}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden flex-col gap-5 md:flex">
          {renderFilterControls('desktop')}
          <p className="text-xs text-[#3d3a36]/50">
            {filterSummary}
          </p>
        </div>
      </div>
    </aside>
  );
}
