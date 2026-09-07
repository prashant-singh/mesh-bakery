export const LOCAL_INVENTORY_KEY = 'mesh-inventory-overrides';

export type LocalInventoryProduct = {
  id: string;
  price_paise: number;
  active: number;
  featured: number;
  campaign_featured?: number;
  /** Legacy key retained while existing browser data is migrated. */
  fifa_featured?: number;
  customizableProperties?: unknown[];
};

export function readLocalInventory(): LocalInventoryProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_INVENTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function localInventoryMaps() {
  const items = readLocalInventory();
  return {
    prices: Object.fromEntries(items.map(item => [item.id, item.price_paise / 100])),
    featured: Object.fromEntries(items.map(item => [item.id, Boolean(item.featured)])),
    campaignFeatured: Object.fromEntries(items.map(item => [item.id, Boolean(item.campaign_featured ?? item.fifa_featured ?? item.featured)])),
    availability: Object.fromEntries(items.map(item => [item.id, Boolean(item.active)])),
    order: items.map(item => item.id),
    customization: Object.fromEntries(items.map(item => [item.id, item.customizableProperties || []])),
  };
}
