export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH || '';

export const RAZORPAY_API_URL =
  (process.env.NEXT_PUBLIC_RAZORPAY_API_URL || '').replace(/\/$/, '');


export function withBasePath(path: string) {
  if (!path.startsWith('/')) return path;
  return `${BASE_PATH}${path}`;
}
