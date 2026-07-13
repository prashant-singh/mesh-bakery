'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { withBasePath } from '@/lib/config';

export type FeaturedConfig = {
  enabled: boolean;
  headline: string;
  description: string;
  largeDescription?: string;
  accentColor?: string;
  animationStyle: 'none' | 'shimmer' | 'arrow' | 'pulse';
};

type FeaturedAnnouncementProps = {
  config: FeaturedConfig | null;
  className?: string;
  fullWidth?: boolean;
};

export function FeaturedAnnouncement({ config, className = '', fullWidth = false }: FeaturedAnnouncementProps) {
  if (!config?.enabled) return null;

  const animationClass =
    config.animationStyle === 'shimmer'
      ? 'featured-announcement--shimmer'
      : config.animationStyle === 'arrow'
        ? 'featured-announcement--arrow'
        : config.animationStyle === 'pulse'
          ? 'featured-announcement--pulse'
          : '';

  return (
    <div className={fullWidth ? className : `max-w-6xl mx-auto px-6 md:px-12 ${className}`}>
      <Link
        href={withBasePath('/featured')}
        className={`featured-announcement group relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#7b4328]/20 px-4 py-6 text-[#fff7dc] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_14px_30px_rgba(122,67,40,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb35f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf7f2] md:px-5 ${animationClass}`}
        style={config.accentColor ? { '--featured-accent': config.accentColor } as CSSProperties : undefined}
        aria-label={`${config.headline}: ${config.description}`}
      >
        <span className="relative z-10 flex min-w-0 flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
          <span className="shrink-0 text-sm font-bold uppercase tracking-widest text-[var(--featured-accent,#ffd07a)]">
            {config.headline}
          </span>
          <span className="min-w-0 text-sm leading-snug text-[#fff7dc]/84 md:text-base">
            {config.description}
          </span>
        </span>
        <ArrowRight className="featured-announcement__arrow relative z-10 h-5 w-5 shrink-0 text-[var(--featured-accent,#ffd07a)] transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
