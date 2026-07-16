"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  LayoutDashboard,
  LogOut,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { RAZORPAY_API_URL, withBasePath } from "@/lib/config";
import { LOCAL_INVENTORY_KEY, readLocalInventory } from "@/lib/localInventory";
import { fetchCatalogue } from "@/lib/catalogueClient";
import {
  LOCAL_FEATURED_CONFIG_KEY,
  readLocalFeaturedConfig,
  type FeaturedConfig,
} from "@/lib/featuredConfig";

type Order = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_json: string | null;
  subtotal_paise: number;
  shipping_paise: number;
  discount_paise: number;
  total_paise: number;
  payment_status: string;
  fulfillment_status: string;
  razorpay_payment_id: string | null;
  confirmation_email_status: string;
  created_at: string;
  awb: string | null;
  tracking_url: string | null;
};
type OrderItem = {
  id: number;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  unit_price_paise: number;
  quantity: number;
  customization_json: string;
};
type CustomField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};
type InventoryProduct = {
  id: string;
  name: string;
  price_paise: number;
  active: number;
  featured: number;
  fifa_featured: number;
  customizableProperties: CustomField[];
  category: string;
  media: Array<{ type: "image" | "video"; url: string }>;
  tags: Array<string | { name: string }>;
  shortDescription: string;
  description: string;
};
const DEFAULT_FIFA_CONFIG: FeaturedConfig = {
  enabled: true,
  headline: "FIFA World Cup 2026",
  description: "Football-inspired prints for the road to 2026.",
  largeDescription:
    "A special football-inspired collection celebrating the road to FIFA World Cup 2026, featuring playful prints for fans, desks, keys, and match-day energy.",
  accentColor: "#ffd07a",
  animationStyle: "arrow",
};
type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
type DashboardSummary = {
  totalOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  totalMoneyPaise: number;
  pendingMoneyPaise: number;
  deliveredMoneyPaise: number;
  totalShippingPaise: number;
  pendingShippingPaise: number;
  deliveredShippingPaise: number;
  totalProfitPaise: number;
};
const statuses = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];
const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((Number.isFinite(paise) ? paise : 0) / 100);
const parse = (value: string | null) => {
  try {
    return value ? (JSON.parse(value) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

function CustomizationEditor({
  product,
  busy,
  onChange,
  onClose,
  onSave,
}: {
  product: InventoryProduct;
  busy: boolean;
  onChange: (product: InventoryProduct) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const update = (index: number, change: Partial<CustomField>) =>
    onChange({
      ...product,
      customizableProperties: product.customizableProperties.map((field, i) =>
        i === index ? { ...field, ...change } : field,
      ),
    });
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#5b6346]">
              customization options
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{product.name}</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          {product.customizableProperties.map((field, index) => (
            <div key={index} className="rounded-2xl border bg-[#faf8f5] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={field.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  placeholder="Label (e.g. Name)"
                  className="rounded-xl border bg-white px-3 py-2"
                />
                <input
                  value={field.key}
                  onChange={(e) => update(index, { key: e.target.value })}
                  placeholder="Key (e.g. name)"
                  className="rounded-xl border bg-white px-3 py-2"
                />
                <select
                  value={field.type}
                  onChange={(e) =>
                    update(index, {
                      type: e.target.value,
                      options: ["select", "color"].includes(e.target.value)
                        ? field.options?.length
                          ? field.options
                          : [""]
                        : undefined,
                    })
                  }
                  className="rounded-xl border bg-white px-3 py-2"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="textarea">Long text</option>
                  <option value="select">Dropdown</option>
                  <option value="color">Color buttons</option>
                </select>
                <input
                  value={field.placeholder || ""}
                  onChange={(e) =>
                    update(index, { placeholder: e.target.value })
                  }
                  placeholder="Placeholder"
                  className="rounded-xl border bg-white px-3 py-2"
                />
              </div>
              {["select", "color"].includes(field.type) && (
                <input
                  value={(field.options || []).join(", ")}
                  onChange={(e) =>
                    update(index, {
                      options: e.target.value
                        .split(",")
                        .map((option) => option.trim()),
                    })
                  }
                  placeholder={
                    field.type === "color"
                      ? "Colors: red, #2563eb, black"
                      : "Options, comma separated"
                  }
                  className="mt-3 w-full rounded-xl border bg-white px-3 py-2"
                />
              )}
              <div className="mt-3 flex justify-between">
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(e) =>
                      update(index, { required: e.target.checked })
                    }
                  />
                  required
                </label>
                <button
                  onClick={() =>
                    onChange({
                      ...product,
                      customizableProperties:
                        product.customizableProperties.filter(
                          (_, i) => i !== index,
                        ),
                    })
                  }
                  className="flex items-center gap-1 text-xs font-bold text-red-700"
                >
                  <Trash2 size={14} />
                  remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            onChange({
              ...product,
              customizableProperties: [
                ...product.customizableProperties,
                {
                  key: `field${product.customizableProperties.length + 1}`,
                  label: "",
                  type: "text",
                },
              ],
            })
          }
          className="mt-4 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold"
        >
          <Plus size={15} />
          add field
        </button>
        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border px-5 py-3 text-sm font-bold"
          >
            cancel
          </button>
          <button
            disabled={busy}
            onClick={onSave}
            className="rounded-full bg-[#ff6b35] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "saving…" : "save customization"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceEditor({
  products,
  onChange,
  onClose,
}: {
  products: InventoryProduct[];
  onChange: (id: string, pricePaise: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="mx-auto my-6 max-w-2xl rounded-3xl bg-white p-6 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#5b6346]">
              inventory pricing
            </p>
            <h2 className="mt-1 text-2xl font-semibold">edit product prices</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-6 max-h-[65vh] space-y-2 overflow-y-auto pr-1">
          {products.map((product) => (
            <label
              key={product.id}
              className="grid grid-cols-[1fr_130px] items-center gap-4 rounded-xl bg-[#faf8f5] p-3"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {product.name}
                </span>
                <span className="font-mono text-[11px] text-black/45">
                  {product.id}
                </span>
              </span>
              <span className="flex items-center rounded-lg border bg-white px-3">
                <span className="text-sm text-black/50">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={product.price_paise / 100}
                  onChange={(event) =>
                    onChange(
                      product.id,
                      Math.round(Number(event.target.value) * 100),
                    )
                  }
                  className="min-w-0 w-full bg-transparent px-2 py-2 text-right text-sm font-bold outline-none"
                />
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full bg-[#2d2a26] px-5 py-3 text-sm font-bold text-white"
          >
            apply price changes
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductEditor({
  product,
  isNew,
  onChange,
  onClose,
  onSave,
  busy,
}: {
  product: InventoryProduct;
  isNew: boolean;
  onChange: (product: InventoryProduct) => void;
  onClose: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const field = <K extends keyof InventoryProduct>(
    key: K,
    value: InventoryProduct[K],
  ) => onChange({ ...product, [key]: value });
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#5b6346]">
              {isNew ? "new product" : "edit product"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isNew ? "add inventory product" : product.name}
            </h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold">
            Product ID
            <input
              disabled={!isNew}
              value={product.id}
              onChange={(event) => field("id", event.target.value)}
              placeholder="mb-32"
              className="mt-1 block h-11 w-full rounded-xl border px-3 disabled:bg-black/5"
            />
          </label>
          <label className="text-xs font-bold">
            Name
            <input
              value={product.name}
              onChange={(event) => field("name", event.target.value)}
              className="mt-1 block h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-xs font-bold">
            Category
            <input
              value={product.category}
              onChange={(event) => field("category", event.target.value)}
              className="mt-1 block h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-xs font-bold">
            Price (₹)
            <input
              type="number"
              min="1"
              value={product.price_paise / 100}
              onChange={(event) =>
                field(
                  "price_paise",
                  Math.round(Number(event.target.value) * 100),
                )
              }
              className="mt-1 block h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-xs font-bold">
            Tags (comma separated)
            <input
              value={product.tags
                .map((tag) => (typeof tag === "string" ? tag : tag.name))
                .join(", ")}
              onChange={(event) =>
                field(
                  "tags",
                  event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                )
              }
              className="mt-1 block h-11 w-full rounded-xl border px-3"
            />
          </label>
          <label className="text-xs font-bold sm:col-span-2">
            Image or video paths (one per line)
            <textarea
              rows={4}
              value={product.media.map((media) => media.url).join("\n")}
              onChange={(event) =>
                field(
                  "media",
                  event.target.value
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((url) => ({
                      type: /\.(mp4|webm|mov)$/i.test(url) ? "video" : "image",
                      url,
                    })),
                )
              }
              placeholder="/products/category/image.png"
              className="mt-1 block w-full rounded-xl border px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="text-xs font-bold sm:col-span-2">
            Short description
            <textarea
              rows={2}
              value={product.shortDescription}
              onChange={(event) =>
                field("shortDescription", event.target.value)
              }
              className="mt-1 block w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="text-xs font-bold sm:col-span-2">
            Description
            <textarea
              rows={4}
              value={product.description}
              onChange={(event) => field("description", event.target.value)}
              className="mt-1 block w-full rounded-xl border px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full border px-5 py-3 text-sm font-bold"
          >
            cancel
          </button>
          <button
            disabled={busy}
            onClick={onSave}
            className="rounded-full bg-[#ff6b35] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "saving…" : isNew ? "add product" : "save product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [section, setSection] = React.useState<
    "dashboard" | "orders" | "inventory"
  >("dashboard");
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [pagination, setPagination] = React.useState<Pagination>({
    page: 1,
    pageSize: 15,
    total: 0,
    totalPages: 1,
  });
  const [selected, setSelected] = React.useState<Order | null>(null);
  const [inventory, setInventory] = React.useState<InventoryProduct[]>([]);
  const [editingProduct, setEditingProduct] =
    React.useState<InventoryProduct | null>(null);
  const [editingCatalogueProduct, setEditingCatalogueProduct] =
    React.useState<InventoryProduct | null>(null);
  const [creatingProduct, setCreatingProduct] = React.useState(false);
  const [inventoryPage, setInventoryPage] = React.useState(1);
  const [inventorySearch, setInventorySearch] = React.useState("");
  const [inventoryDirty, setInventoryDirty] = React.useState(false);
  const [fifaConfig, setFifaConfig] = React.useState<FeaturedConfig | null>(null);
  const [fifaBusy, setFifaBusy] = React.useState(false);
  const [editingPrices, setEditingPrices] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [summary, setSummary] = React.useState<DashboardSummary>({
    totalOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    totalMoneyPaise: 0,
    pendingMoneyPaise: 0,
    deliveredMoneyPaise: 0,
    totalShippingPaise: 0,
    pendingShippingPaise: 0,
    deliveredShippingPaise: 0,
    totalProfitPaise: 0,
  });
  React.useEffect(() => {
    const timer = setTimeout(
      () => setToken(sessionStorage.getItem("mesh-admin-session") || ""),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  const logout = React.useCallback(() => {
    sessionStorage.removeItem("mesh-admin-session");
    setToken("");
  }, []);
  const auth = React.useCallback(
    (extra?: HeadersInit) => ({ ...extra, Authorization: `Bearer ${token}` }),
    [token],
  );
  const api = React.useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`${RAZORPAY_API_URL}${path}`, options);
      const data = await response.json();
      if (response.status === 401) {
        logout();
        throw new Error("Your session expired.");
      }
      if (!response.ok) throw new Error(data.error || "Request failed.");
      return data;
    },
    [logout],
  );
  const loadOrders = React.useCallback(
    async (page = 1) => {
      const data = (await api(`/admin/orders?page=${page}&pageSize=15`, {
        headers: auth(),
      })) as { orders?: Order[]; items?: OrderItem[]; pagination?: Pagination };
      const nextOrders = data.orders || [];
      setOrders(nextOrders);
      setItems(data.items || []);
      setPagination(
        data.pagination || {
          page: 1,
          pageSize: nextOrders.length || 15,
          total: nextOrders.length,
          totalPages: 1,
        },
      );
    },
    [api, auth],
  );
  const loadInventory = React.useCallback(async () => {
    setError("");
    const [data, catalogue, campaign] = await Promise.all([
      api("/admin/products", { headers: auth() }) as Promise<{
        products: InventoryProduct[];
      }>,
      fetchCatalogue<
        Omit<
          InventoryProduct,
          "price_paise" | "active" | "featured" | "fifa_featured"
        > & {
          price: number;
          active?: boolean;
          featured?: boolean;
          fifa_featured?: boolean;
        }
      >(),
      readLocalFeaturedConfig() ??
        (api("/admin/featured-config", { headers: auth() }) as Promise<FeaturedConfig>)
          .catch(() => DEFAULT_FIFA_CONFIG),
    ]);
    setFifaConfig(campaign);
    const remote = new Map(
      (data.products || []).map((product) => [product.id, product]),
    );
    const localItems = readLocalInventory();
    const local = new Map(localItems.map((product) => [product.id, product]));
    const localOrder = localItems.map((product) => product.id);
    const mergedInventory: InventoryProduct[] = catalogue.map((product) => ({
          ...product,
          price_paise:
            local.get(product.id)?.price_paise ??
            remote.get(product.id)?.price_paise ??
            Math.round(product.price * 100),
          active:
            local.get(product.id)?.active ??
            remote.get(product.id)?.active ??
            (product.active === false ? 0 : 1),
          featured:
            local.get(product.id)?.featured ??
            remote.get(product.id)?.featured ??
            (product.featured ? 1 : 0),
          fifa_featured:
            local.get(product.id)?.fifa_featured ??
            remote.get(product.id)?.fifa_featured ??
            (product.fifa_featured ? 1 : 0),
          customizableProperties: (local.get(product.id)
            ?.customizableProperties ??
            remote.get(product.id)?.customizableProperties ??
            product.customizableProperties ??
            []) as CustomField[],
        }));
    const catalogueIds = new Set(mergedInventory.map((product) => product.id));
    for (const product of data.products || []) {
      if (catalogueIds.has(product.id)) continue;
      const localProduct = local.get(product.id);
      mergedInventory.push({
        ...product,
        price_paise: localProduct?.price_paise ?? product.price_paise,
        active: localProduct?.active ?? product.active,
        featured: localProduct?.featured ?? product.featured,
        fifa_featured:
          localProduct?.fifa_featured ?? product.fifa_featured ?? 0,
        customizableProperties: (localProduct?.customizableProperties ??
          product.customizableProperties ?? []) as CustomField[],
      });
    }
    setInventory(
      mergedInventory.sort((left, right) => {
          const leftIndex = localOrder.indexOf(left.id);
          const rightIndex = localOrder.indexOf(right.id);
          if (leftIndex < 0 && rightIndex >= 0) return -1;
          if (rightIndex < 0 && leftIndex >= 0) return 1;
          return (
            (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
            (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex)
          );
        }),
    );
    setInventoryDirty(false);
  }, [api, auth]);
  const loadDashboard = React.useCallback(async () => {
    const data = (await api("/admin/dashboard", {
      headers: auth(),
    })) as Partial<DashboardSummary>;
    setSummary({
      totalOrders: data.totalOrders || 0,
      activeOrders: data.activeOrders || 0,
      deliveredOrders: data.deliveredOrders || 0,
      totalMoneyPaise: data.totalMoneyPaise || 0,
      pendingMoneyPaise: data.pendingMoneyPaise || 0,
      deliveredMoneyPaise: data.deliveredMoneyPaise || 0,
      totalShippingPaise: data.totalShippingPaise || 0,
      pendingShippingPaise: data.pendingShippingPaise || 0,
      deliveredShippingPaise: data.deliveredShippingPaise || 0,
      totalProfitPaise: data.totalProfitPaise || 0,
    });
  }, [api, auth]);
  React.useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      setBusy(true);
      Promise.all([loadDashboard(), loadOrders()])
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [token, loadDashboard, loadOrders]);
  React.useEffect(() => {
    if (!token || section !== "inventory") return;
    const timer = setTimeout(
      () => loadInventory().catch((e) => setError(e.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, [section, token, loadInventory]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = (await api("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })) as { token: string };
      sessionStorage.setItem("mesh-admin-session", data.token);
      setPassword("");
      setToken(data.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function updateStatus(id: string, status: string) {
    try {
      await api(`/admin/orders/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ fulfillmentStatus: status }),
      });
      setOrders((v) =>
        v.map((o) => (o.id === id ? { ...o, fulfillment_status: status } : o)),
      );
      setSelected((v) =>
        v?.id === id ? { ...v, fulfillment_status: status } : v,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function addAwb(id: string) {
    const awb = prompt("Enter the Delhivery AWB number");
    if (!awb) return;
    try {
      await api(`/admin/orders/${encodeURIComponent(id)}/shipment`, {
        method: "POST",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ awb }),
      });
      await loadOrders(pagination.page);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function saveAvailability(product: InventoryProduct, active: boolean) {
    setInventory((value) =>
      value.map((item) =>
        item.id === product.id ? { ...item, active: active ? 1 : 0 } : item,
      ),
    );
    setInventoryDirty(true);
  }
  function saveHeroVisibility(product: InventoryProduct, featured: boolean) {
    setInventory((value) =>
      value.map((item) =>
        item.id === product.id ? { ...item, featured: featured ? 1 : 0 } : item,
      ),
    );
    setInventoryDirty(true);
  }
  function saveFifaVisibility(product: InventoryProduct, fifaFeatured: boolean) {
    setInventory((value) =>
      value.map((item) =>
        item.id === product.id
          ? { ...item, fifa_featured: fifaFeatured ? 1 : 0 }
          : item,
      ),
    );
    setInventoryDirty(true);
  }
  function moveInventoryProduct(productId: string, direction: -1 | 1) {
    const index = inventory.findIndex((product) => product.id === productId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= inventory.length) return;
    const next = [...inventory];
    [next[index], next[target]] = [next[target], next[index]];
    setInventory(next);
    setInventoryDirty(true);
  }
  function saveCustomization() {
    if (!editingProduct) return;
    setInventory((value) =>
      value.map((product) =>
        product.id === editingProduct.id ? editingProduct : product,
      ),
    );
    setEditingProduct(null);
    setInventoryDirty(true);
  }
  async function updateInventory() {
    setBusy(true);
    setError("");
    localStorage.setItem(LOCAL_INVENTORY_KEY, JSON.stringify(inventory));
    setInventoryDirty(false);
    try {
      await api("/admin/products/settings", {
        method: "PATCH",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ products: inventory }),
      });
    } catch (e) {
      setError(
        `Saved for this local browser. Live Worker update failed: ${(e as Error).message}`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function updateFifaCampaign() {
    if (!fifaConfig) return;
    setFifaBusy(true);
    setError("");
    localStorage.setItem(LOCAL_FEATURED_CONFIG_KEY, JSON.stringify(fifaConfig));
    try {
      const saved = (await api("/admin/featured-config", {
        method: "PATCH",
        headers: auth({ "Content-Type": "application/json" }),
        body: JSON.stringify(fifaConfig),
      })) as FeaturedConfig;
      setFifaConfig(saved);
    } catch {
      setError(
        "FIFA campaign saved for this local browser. Deploy the updated Worker to publish it for every visitor.",
      );
    } finally {
      setFifaBusy(false);
    }
  }
  function updatePrice(productId: string, pricePaise: number) {
    setInventory((value) =>
      value.map((product) =>
        product.id === productId
          ? { ...product, price_paise: pricePaise }
          : product,
      ),
    );
    setInventoryDirty(true);
  }
  function openNewProduct() {
    setCreatingProduct(true);
    setEditingCatalogueProduct({
      id: "",
      name: "",
      price_paise: 100,
      active: 1,
      featured: 0,
      fifa_featured: 0,
      customizableProperties: [],
      category: "",
      media: [],
      tags: [],
      shortDescription: "",
      description: "",
    });
  }
  async function saveCatalogueProduct() {
    if (!editingCatalogueProduct) return;
    setBusy(true);
    setError("");
    const payload = {
      ...editingCatalogueProduct,
      price: editingCatalogueProduct.price_paise / 100,
    };
    try {
      await api(
        creatingProduct
          ? "/admin/products"
          : `/admin/products/${encodeURIComponent(editingCatalogueProduct.id)}`,
        {
          method: creatingProduct ? "POST" : "PATCH",
          headers: auth({ "Content-Type": "application/json" }),
          body: JSON.stringify({ product: payload }),
        },
      );
      setEditingCatalogueProduct(null);
      setCreatingProduct(false);
      await loadInventory();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteCatalogueProduct(product: InventoryProduct) {
    if (!confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    try {
      await api(`/admin/products/${encodeURIComponent(product.id)}`, {
        method: "DELETE",
        headers: auth(),
      });
      await loadInventory();
    } catch (error) {
      setError((error as Error).message);
    }
  }

  if (!token)
    return (
      <main className="min-h-screen px-5 py-16">
        <div className="mx-auto max-w-md">
          <Link
            href={withBasePath("/")}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            storefront
          </Link>
          <form
            onSubmit={login}
            className="rounded-3xl border bg-white p-8 shadow-sm"
          >
            <ShieldCheck size={34} />
            <h1 className="mt-4 text-3xl font-semibold">admin dashboard</h1>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin password"
              className="mt-7 h-12 w-full rounded-xl border px-4"
              required
            />
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <button
              disabled={busy}
              className="mt-5 h-12 w-full rounded-full bg-[#2d2a26] font-bold text-white"
            >
              {busy ? "signing in…" : "sign in"}
            </button>
          </form>
        </div>
      </main>
    );

  const selectedItems = selected
    ? items.filter((item) => item.order_id === selected.id)
    : [];
  const inventoryPageSize = 15;
  const normalizedInventorySearch = inventorySearch.trim().toLowerCase();
  const filteredInventory = inventory.filter(
    (product) =>
      !normalizedInventorySearch ||
      product.id.toLowerCase().includes(normalizedInventorySearch) ||
      product.name.toLowerCase().includes(normalizedInventorySearch),
  );
  const inventoryTotalPages = Math.max(
    1,
    Math.ceil(filteredInventory.length / inventoryPageSize),
  );
  const visibleInventory = filteredInventory.slice(
    (inventoryPage - 1) * inventoryPageSize,
    inventoryPage * inventoryPageSize,
  );
  return (
    <main className="min-h-screen bg-[#f5f2ed] lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b bg-[#2d2a26] p-4 text-white lg:min-h-screen lg:border-0 lg:p-5">
        <div className="mb-5 flex justify-between lg:block">
          <div>
            <p className="text-xs tracking-widest text-white/50">mesh bakery</p>
            <h1 className="text-xl font-semibold">admin</h1>
          </div>
          <button onClick={logout} className="lg:hidden">
            <LogOut size={19} />
          </button>
        </div>
        <nav className="flex gap-2 lg:flex-col">
          <button
            onClick={() => setSection("dashboard")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${section === "dashboard" ? "bg-white text-[#2d2a26]" : "text-white/70"}`}
          >
            <LayoutDashboard size={17} />
            Dashboard
          </button>
          <button
            onClick={() => setSection("orders")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${section === "orders" ? "bg-white text-[#2d2a26]" : "text-white/70"}`}
          >
            <ClipboardList size={17} />
            Orders
          </button>
          <button
            onClick={() => setSection("inventory")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${section === "inventory" ? "bg-white text-[#2d2a26]" : "text-white/70"}`}
          >
            <Boxes size={17} />
            Inventory
          </button>
        </nav>
        <button
          onClick={logout}
          className="mt-8 hidden items-center gap-2 text-sm text-white/60 lg:flex"
        >
          <LogOut size={16} />
          log out
        </button>
      </aside>
      <div className="min-w-0 p-4 sm:p-7 lg:p-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#5b6346]">
              admin dashboard
            </p>
            <h2 className="text-3xl font-semibold">{section}</h2>
          </div>
          <button
            onClick={() =>
              section === "dashboard"
                ? loadDashboard()
                : section === "orders"
                  ? loadOrders(pagination.page)
                  : loadInventory()
            }
            className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-bold"
          >
            <RefreshCw size={15} />
            refresh
          </button>
        </header>
        {error && (
          <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {section === "dashboard" && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-black/45">
                total orders
              </p>
              <p className="mt-2 text-4xl font-semibold">
                {summary.totalOrders}
              </p>
            </div>
            <div className="rounded-2xl border bg-[#fff7dc] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#795622]">
                active orders
              </p>
              <p className="mt-2 text-4xl font-semibold">
                {summary.activeOrders}
              </p>
            </div>
            <div className="rounded-2xl border bg-emerald-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                delivered orders
              </p>
              <p className="mt-2 text-4xl font-semibold">
                {summary.deliveredOrders}
              </p>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-black/45">
                total money
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {money(summary.totalMoneyPaise)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
                <div>
                  <p className="text-black/45">pending order money</p>
                  <p className="mt-1 text-base font-bold">
                    {money(summary.pendingMoneyPaise)}
                  </p>
                </div>
                <div>
                  <p className="text-black/45">delivered order money</p>
                  <p className="mt-1 text-base font-bold">
                    {money(summary.deliveredMoneyPaise)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-black/45">
                total shipping
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {money(summary.totalShippingPaise)}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
                <div>
                  <p className="text-black/45">pending order shipping</p>
                  <p className="mt-1 text-base font-bold">
                    {money(summary.pendingShippingPaise)}
                  </p>
                </div>
                <div>
                  <p className="text-black/45">delivered order shipping</p>
                  <p className="mt-1 text-base font-bold">
                    {money(summary.deliveredShippingPaise)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-[#2d2a26] p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-white/55">
                total profit
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {money(summary.totalProfitPaise)}
              </p>
            </div>
          </section>
        )}
        {section === "orders" && (
          <section>
            <div className="overflow-hidden rounded-2xl border bg-white">
              <div className="hidden grid-cols-[1.4fr_1fr_100px_110px_110px_70px] gap-3 border-b bg-[#faf8f5] px-4 py-3 text-xs font-bold text-black/50 md:grid">
                <span>order</span>
                <span>customer</span>
                <span>total</span>
                <span>payment</span>
                <span>status</span>
                <span />
              </div>
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="grid gap-2 border-b px-4 py-3 last:border-0 md:grid-cols-[1.4fr_1fr_100px_110px_110px_70px] md:items-center md:gap-3"
                >
                  <div>
                    <p className="font-mono text-xs font-bold normal-case">
                      {order.id}
                    </p>
                    <p className="text-[11px] text-black/45">
                      {new Date(`${order.created_at}Z`).toLocaleDateString(
                        "en-IN",
                      )}
                    </p>
                    <div className="mt-1.5 flex -space-x-2">
                      {items
                        .filter(
                          (item) =>
                            item.order_id === order.id && item.product_image_url,
                        )
                        .slice(0, 4)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="relative h-8 w-8 overflow-hidden rounded-lg border-2 border-white bg-[#e9e4db]"
                            title={`${item.product_name} (${item.product_id})`}
                          >
                            <Image
                              src={withBasePath(item.product_image_url!)}
                              alt={item.product_name}
                              fill
                              className="object-cover"
                              sizes="32px"
                            />
                          </div>
                        ))}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10px] font-semibold normal-case text-[#5b6346]">
                      {items
                        .filter((item) => item.order_id === order.id)
                        .map((item) => item.product_id)
                        .join(", ")}
                    </p>
                  </div>
                  <p className="truncate text-sm font-semibold">
                    {order.customer_name}
                  </p>
                  <p className="text-sm font-bold">
                    {money(order.total_paise)}
                  </p>
                  <span className="w-fit rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800">
                    {order.payment_status}
                  </span>
                  <span className="text-xs font-semibold">
                    {order.fulfillment_status}
                  </span>
                  <button
                    onClick={() => setSelected(order)}
                    className="flex items-center gap-1 text-xs font-bold text-[#ff6b35]"
                  >
                    <Eye size={14} />
                    view
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span>{pagination.total} orders</span>
              <div className="flex items-center gap-3">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => loadOrders(pagination.page - 1)}
                  className="rounded-full border bg-white p-2 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadOrders(pagination.page + 1)}
                  className="rounded-full border bg-white p-2 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}
        {section === "inventory" && (
          <section>
            <div className="mb-5 flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">product inventory</h3>
                <p className="text-sm text-black/50">
                  the saved order controls product order across the storefront
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openNewProduct}
                  className="flex items-center gap-1 rounded-full bg-[#2d2a26] px-4 py-2 text-xs font-bold text-white"
                >
                  <Plus size={14} />
                  add product
                </button>
                <button
                  disabled={!inventoryDirty || busy}
                  onClick={updateInventory}
                  className="rounded-full bg-[#ff6b35] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-[#9b938a]"
                >
                  {busy
                    ? "updating…"
                    : inventoryDirty
                      ? "update inventory"
                      : "inventory updated"}
                </button>
                <button
                  onClick={loadInventory}
                  className="rounded-full border bg-white px-4 py-2 text-xs font-bold"
                >
                  refresh products
                </button>
              </div>
            </div>
            {fifaConfig && (
              <div className="mb-5 rounded-2xl border bg-white p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">FIFA featured campaign</h4>
                    <p className="text-xs text-black/50">
                      controls the FIFA banner and featured collection page
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={fifaConfig.enabled}
                      onChange={(event) =>
                        setFifaConfig({ ...fifaConfig, enabled: event.target.checked })
                      }
                      className="h-5 w-5 accent-[#ff6b35]"
                    />
                    campaign enabled
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-bold">
                    Headline
                    <input
                      value={fifaConfig.headline}
                      onChange={(event) => setFifaConfig({ ...fifaConfig, headline: event.target.value })}
                      className="mt-1 h-10 w-full rounded-lg border px-3 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Short description
                    <input
                      value={fifaConfig.description}
                      onChange={(event) => setFifaConfig({ ...fifaConfig, description: event.target.value })}
                      className="mt-1 h-10 w-full rounded-lg border px-3 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-bold md:col-span-2">
                    Collection page description
                    <textarea
                      rows={3}
                      value={fifaConfig.largeDescription || ""}
                      onChange={(event) => setFifaConfig({ ...fifaConfig, largeDescription: event.target.value })}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Accent color
                    <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border px-2">
                      <input
                        type="color"
                        value={fifaConfig.accentColor || "#ffd07a"}
                        onChange={(event) => setFifaConfig({ ...fifaConfig, accentColor: event.target.value })}
                        className="h-7 w-9 border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-xs font-normal">{fifaConfig.accentColor}</span>
                    </div>
                  </label>
                  <label className="text-xs font-bold">
                    Animation
                    <select
                      value={fifaConfig.animationStyle}
                      onChange={(event) => setFifaConfig({ ...fifaConfig, animationStyle: event.target.value as FeaturedConfig["animationStyle"] })}
                      className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal"
                    >
                      <option value="none">None</option>
                      <option value="shimmer">Shimmer</option>
                      <option value="arrow">Arrow</option>
                      <option value="pulse">Pulse</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={fifaBusy}
                    onClick={updateFifaCampaign}
                    className="rounded-full bg-[#5b6346] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {fifaBusy ? "saving…" : "update FIFA campaign"}
                  </button>
                </div>
              </div>
            )}
            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <input
                value={inventorySearch}
                onChange={(e) => {
                  setInventorySearch(e.target.value);
                  setInventoryPage(1);
                }}
                placeholder="Search by product name or ID"
                className="h-11 w-full rounded-xl border bg-white pl-10 pr-4 text-sm"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border bg-white">
              <div className="hidden grid-cols-[90px_minmax(160px,1fr)_45px_95px_55px_55px_90px_170px] gap-3 border-b bg-[#faf8f5] px-4 py-3 text-xs font-bold text-black/50 xl:grid">
                <span>product ID</span>
                <span>product</span>
                <span>fields</span>
                <span>price</span>
                <span>hero</span>
                <span>FIFA</span>
                <span>availability</span>
                <span>actions</span>
              </div>
              {visibleInventory.map((product) => {
                const globalIndex = inventory.findIndex(
                  (item) => item.id === product.id,
                );
                const thumbnailMedia = product.media?.find(
                  (media) => media.type === "image",
                );
                return (
                  <div
                    key={product.id}
                    className="grid gap-3 border-b px-4 py-4 last:border-0 xl:min-h-24 xl:grid-cols-[90px_minmax(160px,1fr)_45px_95px_55px_55px_90px_170px] xl:items-center"
                  >
                    <p className="break-all font-mono text-xs font-bold normal-case">
                      {product.id}
                    </p>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#f1ede7]">
                        {thumbnailMedia ? (
                          <Image
                            src={withBasePath(thumbnailMedia.url)}
                            alt={`${product.name} thumbnail`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <Boxes className="absolute inset-0 m-auto h-6 w-6 text-black/25" />
                        )}
                      </div>
                      <p className="min-w-0 text-sm font-semibold xl:truncate">
                        {product.name}
                      </p>
                    </div>
                    <p className="text-xs text-black/55">
                      <span className="xl:hidden">custom fields: </span>
                      {product.customizableProperties?.length || 0}
                    </p>
                    <label className="flex h-9 items-center rounded-lg border bg-white px-2">
                      <span className="text-xs text-black/45">₹</span>
                      <input
                        aria-label={`price for ${product.name}`}
                        type="number"
                        min="1"
                        step="1"
                        value={product.price_paise / 100}
                        onChange={(event) =>
                          updatePrice(
                            product.id,
                            Math.round(Number(event.target.value) * 100),
                          )
                        }
                        className="min-w-0 w-full bg-transparent px-1 text-right text-xs font-bold outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input
                        aria-label={`FIFA collection visibility for ${product.name}`}
                        type="checkbox"
                        checked={Boolean(product.fifa_featured)}
                        onChange={(e) =>
                          saveFifaVisibility(product, e.target.checked)
                        }
                        className="h-5 w-5 accent-[#2563eb]"
                      />
                      <span className="xl:hidden">
                        FIFA: {product.fifa_featured ? "shown" : "hidden"}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input
                        aria-label={`hero visibility for ${product.name}`}
                        type="checkbox"
                        checked={Boolean(product.featured)}
                        onChange={(e) =>
                          saveHeroVisibility(product, e.target.checked)
                        }
                        className="h-5 w-5 accent-[#ff6b35]"
                      />
                      <span>{product.featured ? "shown" : "hidden"}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input
                        aria-label={`availability for ${product.name}`}
                        type="checkbox"
                        checked={Boolean(product.active)}
                        onChange={(e) =>
                          saveAvailability(product, e.target.checked)
                        }
                        className="h-5 w-5 accent-[#5b6346]"
                      />
                      <span>{product.active ? "available" : "out"}</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1 xl:flex-nowrap">
                      <button
                        title="Edit product"
                        aria-label={`edit ${product.name}`}
                        onClick={() => {
                          setCreatingProduct(false);
                          setEditingCatalogueProduct({
                            ...product,
                            media: [...(product.media || [])],
                            tags: [...(product.tags || [])],
                          });
                        }}
                        className="rounded-full p-2 text-[#5b6346]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="Move up"
                        aria-label={`move ${product.name} up`}
                        disabled={globalIndex === 0}
                        onClick={() => moveInventoryProduct(product.id, -1)}
                        className="rounded-full border bg-white p-2 disabled:opacity-25"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        title="Move down"
                        aria-label={`move ${product.name} down`}
                        disabled={globalIndex === inventory.length - 1}
                        onClick={() => moveInventoryProduct(product.id, 1)}
                        className="rounded-full border bg-white p-2 disabled:opacity-25"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        title="Customize"
                        onClick={() =>
                          setEditingProduct({
                            ...product,
                            customizableProperties: (
                              product.customizableProperties || []
                            ).map((field) => ({
                              ...field,
                              options: [...(field.options || [])],
                            })),
                          })
                        }
                        className="rounded-full p-2 text-[#ff6b35]"
                      >
                        <Settings2 size={16} />
                      </button>
                      <button
                        title="Delete product"
                        aria-label={`delete ${product.name}`}
                        onClick={() => deleteCatalogueProduct(product)}
                        className="rounded-full p-2 text-red-700"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {visibleInventory.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-black/50">
                  no products match your search
                </p>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span>
                {filteredInventory.length === inventory.length
                  ? `${inventory.length} products`
                  : `${filteredInventory.length} of ${inventory.length} products`}
              </span>
              <div className="flex items-center gap-3">
                <button
                  disabled={inventoryPage <= 1}
                  onClick={() =>
                    setInventoryPage((page) => Math.max(1, page - 1))
                  }
                  className="rounded-full border bg-white p-2 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>
                  page {inventoryPage} of {inventoryTotalPages}
                </span>
                <button
                  disabled={inventoryPage >= inventoryTotalPages}
                  onClick={() =>
                    setInventoryPage((page) =>
                      Math.min(inventoryTotalPages, page + 1),
                    )
                  }
                  className="rounded-full border bg-white p-2 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="ml-auto min-h-full max-w-2xl bg-white p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <div>
                <p className="font-mono text-sm font-bold normal-case">
                  {selected.id}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">order details</h2>
                <p className="mt-1 text-xs text-black/50">
                  {new Date(`${selected.created_at}Z`).toLocaleString("en-IN", {
                    dateStyle: "long",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  })}
                </p>
              </div>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-black/45">
                  customer
                </p>
                <p className="mt-2 font-semibold">{selected.customer_name}</p>
                <p className="normal-case text-sm">{selected.customer_email}</p>
                <p className="text-sm">{selected.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-black/45">
                  address
                </p>
                <p className="mt-2 text-sm">
                  {Object.values(parse(selected.address_json))
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase text-black/45">items</p>
              {selectedItems.map((item) => (
                <div key={item.id} className="mt-3 flex gap-3 border-b pb-3 text-sm">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#e9e4db]">
                    {item.product_image_url && (
                      <Image
                        src={withBasePath(item.product_image_url)}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <strong>
                        {item.quantity} × {item.product_name}
                      </strong>
                      <span className="shrink-0 text-right">
                        <span className="block font-bold">
                          {money(item.quantity * item.unit_price_paise)}
                        </span>
                        <span className="block text-[10px] font-normal text-black/45">
                          {money(item.unit_price_paise)} each
                        </span>
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] font-semibold normal-case text-[#5b6346]">
                      product ID: {item.product_id}
                    </p>
                    <p className="mt-1 text-xs text-black/55">
                      {Object.entries(parse(item.customization_json))
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2 rounded-xl bg-[#faf8f5] p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-black/60">items subtotal</span>
                <span>{money(selected.subtotal_paise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60">shipping</span>
                <span>{money(selected.shipping_paise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/60">discount</span>
                <span>-{money(selected.discount_paise || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-xl font-bold">
                <span>order total</span>
                <span>{money(selected.total_paise)}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <select
                value={selected.fulfillment_status}
                onChange={(e) => updateStatus(selected.id, e.target.value)}
                className="rounded-full border px-4 py-2 text-sm"
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              {selected.payment_status === "paid" && !selected.awb && (
                <button
                  onClick={() => addAwb(selected.id)}
                  className="rounded-full bg-[#ff6b35] px-4 py-2 text-sm font-bold text-white"
                >
                  add AWB
                </button>
              )}
              {selected.awb && (
                <a
                  href={selected.tracking_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border px-4 py-2 text-sm font-bold"
                >
                  track {selected.awb}
                </a>
              )}
            </div>
            <div className="mt-5 rounded-xl bg-[#faf8f5] p-4 text-xs">
              <p>payment: {selected.payment_status}</p>
              <p>email: {selected.confirmation_email_status || "pending"}</p>
              {selected.razorpay_payment_id && (
                <p className="break-all normal-case">
                  {selected.razorpay_payment_id}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {editingPrices && (
        <PriceEditor
          products={inventory}
          onChange={updatePrice}
          onClose={() => setEditingPrices(false)}
        />
      )}
      {editingProduct && (
        <CustomizationEditor
          product={editingProduct}
          busy={busy}
          onChange={setEditingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={saveCustomization}
        />
      )}
      {editingCatalogueProduct && (
        <ProductEditor
          product={editingCatalogueProduct}
          isNew={creatingProduct}
          onChange={setEditingCatalogueProduct}
          onClose={() => {
            setEditingCatalogueProduct(null);
            setCreatingProduct(false);
          }}
          onSave={saveCatalogueProduct}
          busy={busy}
        />
      )}
    </main>
  );
}
