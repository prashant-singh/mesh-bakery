export function productSlug(product: { id: string; name: string }) {
  const name = product.name
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${product.id.toLowerCase()}-${name}`;
}

export function productPath(product: { id: string; name: string }) {
  return `/product?id=${encodeURIComponent(product.id)}`;
}
