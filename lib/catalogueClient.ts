import { BASE_PATH, RAZORPAY_API_URL } from '@/lib/config';

export async function fetchCatalogue<T>() {
  if (RAZORPAY_API_URL) {
    try {
      const response = await fetch(`${RAZORPAY_API_URL}/catalogue`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json() as { products?: T[] };
        if (Array.isArray(data.products) && data.products.length) return data.products;
      }
    } catch {
      // The JSON seed keeps the static site usable until the DB Worker is deployed.
    }
  }
  const response = await fetch(`${BASE_PATH}/products.json?v=${Date.now()}`);
  if (!response.ok) throw new Error('Catalogue is unavailable.');
  return await response.json() as T[];
}
