import { BASE_PATH, RAZORPAY_API_URL } from '@/lib/config';

export type FeaturedConfig = {
  enabled: boolean;
  headline: string;
  description: string;
  largeDescription?: string;
  accentColor?: string;
  animationStyle: 'none' | 'shimmer' | 'arrow' | 'pulse';
};

export const LOCAL_FEATURED_CONFIG_KEY = 'mesh-bakery-featured-config';

export function readLocalFeaturedConfig(): FeaturedConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(LOCAL_FEATURED_CONFIG_KEY);
    return value ? JSON.parse(value) as FeaturedConfig : null;
  } catch {
    return null;
  }
}

export async function fetchFeaturedConfig(): Promise<FeaturedConfig> {
  const local = readLocalFeaturedConfig();
  if (local) return local;
  const primaryUrl = RAZORPAY_API_URL
    ? `${RAZORPAY_API_URL}/featured-config`
    : `${BASE_PATH}/featured-config.json?v=${Date.now()}`;
  const response = await fetch(primaryUrl);
  if (response.ok) return response.json() as Promise<FeaturedConfig>;
  if (RAZORPAY_API_URL) {
    const fallback = await fetch(`${BASE_PATH}/featured-config.json?v=${Date.now()}`);
    if (fallback.ok) return fallback.json() as Promise<FeaturedConfig>;
  }
  throw new Error('Unable to load the featured campaign.');
}
