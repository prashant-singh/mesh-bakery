export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH || '';


export function withBasePath(path: string) {
  if (!path.startsWith('/')) return path;
  return `${basePath}${path}`;
}
