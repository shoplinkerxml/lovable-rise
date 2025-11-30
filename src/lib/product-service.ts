import { supabase } from "@/integrations/supabase/client";
import { ApiError } from "./user-service";
import { SessionValidator } from "./session-validation";
import { SubscriptionValidationService } from "./subscription-validation-service";
import { CACHE_TTL, readCache, writeCache, removeCache } from "./cache-utils";

export interface Product {
  id: string;
  store_id: string;
  supplier_id?: number | null;
  external_id: string;
  name: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: number | null;
  category_external_id?: string | null;
  currency_id?: string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity: number;
  available: boolean;
  state: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

export interface ProductParam {
  id?: string;
  product_id?: string;
  name: string;
  value: string;
  order_index: number;
  paramid?: string;
  valueid?: string;
}

export interface ProductImage {
  id?: string;
  product_id?: string;
  url: string;
  order_index: number;
  is_main?: boolean;
  alt_text?: string;
}

export interface ProductAggregated extends Product {
  mainImageUrl?: string;
  categoryName?: string;
  supplierName?: string;
  linkedStoreIds?: string[];
}

export interface CreateProductData {
  store_id?: string;
  external_id: string;
  name: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: number | string | null;
  category_external_id?: string | null;
  supplier_id?: number | string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity?: number;
  available?: boolean;
  state?: string;
  params?: ProductParam[];
  images?: ProductImage[];
  links?: Array<{
    store_id: string;
    is_active?: boolean;
    custom_price?: number | null;
    custom_price_promo?: number | null;
    custom_stock_quantity?: number | null;
    custom_available?: boolean | null;
    custom_name?: string | null;
    custom_description?: string | null;
    custom_category_id?: number | null;
  }>;
}

export interface UpdateProductData {
  store_id?: string;
  external_id?: string;
  name?: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: number | string | null;
  category_external_id?: string | null;
  supplier_id?: number | string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity?: number;
  available?: boolean;
  state?: string;
  params?: ProductParam[];
  images?: ProductImage[];
}

export interface ProductLimitInfo {
  current: number;
  max: number;
  canCreate: boolean;
}

type ProductListPage = {
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
  total: number;
};

type ProductListResponseObj = {
  products?: ProductAggregated[];
  page?: ProductListPage;
};

type ImageInput = ProductImage & { object_key?: string };

export interface StoreProductLink {
  is_active?: boolean;
  custom_price?: number | null;
  custom_price_old?: number | null;
  custom_price_promo?: number | null;
  custom_stock_quantity?: number | null;
  custom_available?: boolean | null;
  custom_name?: string | null;
  custom_description?: string | null;
  custom_category_id?: string | null;
}

export type StoreProductLinkPatchInput = Partial<StoreProductLink>;

export class ProductService {
  private static inFlightStores: Promise<
    Array<{
      id: string;
      store_name: string;
      store_url: string | null;
      is_active: boolean;
      productsCount: number;
      categoriesCount: number;
    }>
  > | null = null;

  private static inFlightLinksByProduct: Map<string, Promise<string[]>> = new Map();
  private static inFlightRecomputeByStore: Map<string, Promise<void>> = new Map();

  private static castNullableNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private static edgeError(
    error: { context?: { status?: number }; status?: number; statusCode?: number; message?: string } | null,
    fallbackKey: string,
  ): never {
    const status = (error?.context?.status ?? error?.status ?? error?.statusCode) as number | undefined;
    const message = (error?.message as string | undefined) || undefined;
    if (status === 403) throw new ApiError("permission_denied", 403, "PERMISSION_DENIED");
    if (status === 400) throw new ApiError("products_limit_reached", 400, "LIMIT_REACHED");
    if (status === 422) throw new ApiError("validation_error", 422, "VALIDATION_ERROR");
    throw new ApiError(message || fallbackKey, status || 500);
  }

  private static async getAccessToken(): Promise<string | null> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = (authData?.session?.access_token as string | null) || null;
    return accessToken;
  }

  private static async invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const token = await ProductService.getAccessToken();
    const { data, error } = await supabase.functions.invoke<T | string>(name, {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (error) ProductService.edgeError(error, name);
    const resp = typeof data === "string" ? (JSON.parse(data as unknown as string) as T) : (data as T);
    return resp;
  }

  /** Получение store_ids текущего пользователя (через функции) */
  private static async getUserStoreIds(): Promise<string[]> {
    const stores = await ProductService.getUserStores();
    return stores.filter((s) => s.is_active).map((s) => s.id);
  }

  /** Получение полной информации о магазинах пользователя (только функции + кэш) */
  static async getUserStores(): Promise<
    Array<{
      id: string;
      store_name: string;
      store_url: string | null;
      is_active: boolean;
      productsCount: number;
      categoriesCount: number;
    }>
  > {
    const { ShopService } = await import("@/lib/shop-service");
    const shops = await ShopService.getShopsAggregated();
    const mapped = (shops || []).map((s) => ({
      id: String(s.id),
      store_name: String(s.store_name || ""),
      store_url: s.store_url ? String(s.store_url) : null,
      is_active: !!s.is_active,
      productsCount: Number(s.productsCount ?? 0),
      categoriesCount: Number(s.categoriesCount ?? 0),
    }));
    return mapped;
  }

  /** Получение продуктов для конкретного магазина через функцию user-products-list */
  static async getProductsForStore(storeId: string): Promise<Product[]> {
    const productsAgg = await ProductService.getProductsAggregated(storeId);
    return productsAgg as Product[];
  }

  /** Агрегированный список продуктов (только функция user-products-list) */
  static async getProductsAggregated(storeId?: string | null): Promise<ProductAggregated[]> {
    const resp = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", { store_id: storeId ?? null });
    const rows = Array.isArray(resp?.products) ? resp!.products! : [];
    return rows;
  }

  static async getProductsFirstPage(
    storeId: string | null,
    limit: number,
    options?: { bypassCache?: boolean },
  ): Promise<{
    products: ProductAggregated[];
    page: {
      limit: number;
      offset: number;
      hasMore: boolean;
      nextOffset: number | null;
      total: number;
    };
  }> {
    const sizedKey = `rq:products:first:${storeId ?? "all"}:${limit}`;
    if (!options?.bypassCache) {
      const cached = readCache<{ items: ProductAggregated[]; page: ProductListPage }>(sizedKey, false);
      if (cached?.data && Array.isArray(cached.data.items)) {
        (async () => {
          try {
            const fresh = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", {
              store_id: storeId ?? null,
              limit,
              offset: 0,
            });
            const productsN = Array.isArray(fresh?.products) ? fresh.products! : [];
            const pageN: ProductListPage = {
              limit,
              offset: 0,
              hasMore: !!fresh?.page?.hasMore,
              nextOffset: fresh?.page?.nextOffset ?? null,
              total: fresh?.page?.total ?? productsN.length,
            };
            writeCache(sizedKey, { items: productsN, page: pageN }, CACHE_TTL.productsPage);
          } catch { /* ignore */ }
        })();
        return { products: cached.data.items, page: cached.data.page };
      }
    }

    const fresh = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", {
      store_id: storeId ?? null,
      limit,
      offset: 0,
    });
    const products = Array.isArray(fresh?.products) ? fresh.products! : [];
    const page: ProductListPage = {
      limit,
      offset: 0,
      hasMore: !!fresh?.page?.hasMore,
      nextOffset: fresh?.page?.nextOffset ?? null,
      total: fresh?.page?.total ?? products.length,
    };
    writeCache(sizedKey, { items: products, page }, CACHE_TTL.productsPage);
    return { products, page };
  }

  static async getProductsPage(
    storeId: string | null,
    limit: number,
    offset: number,
  ): Promise<{
    products: ProductAggregated[];
    page: {
      limit: number;
      offset: number;
      hasMore: boolean;
      nextOffset: number | null;
      total: number;
    };
  }> {
    const resp = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", {
      store_id: storeId ?? null,
      limit,
      offset,
    });
    const products = Array.isArray(resp?.products) ? resp!.products! : [];
    const page: ProductListPage = {
      limit,
      offset,
      hasMore: !!resp?.page?.hasMore,
      nextOffset: resp?.page?.nextOffset ?? null,
      total: resp?.page?.total ?? products.length,
    };
    return { products, page };
  }

  static updateFirstPageCaches(
    storeId: string | null,
    mutate: (items: unknown[]) => unknown[],
  ) {
    try {
      if (typeof window === "undefined") return;
      const prefix = `rq:products:first:${storeId ?? "all"}`;
      const keysToUpdate: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        if (k === prefix || k.startsWith(`${prefix}:`)) keysToUpdate.push(k);
      }
      for (const key of keysToUpdate) {
        const cached = readCache<{ items: unknown[]; page?: unknown }>(key, true);
        if (!cached || !Array.isArray(cached.data.items)) continue;
        const nextItems = mutate(cached.data.items);
        writeCache(key, { items: nextItems, page: cached.data.page }, CACHE_TTL.productsPage);
      }
    } catch { void 0; }
  }

  static patchProductCaches(
    productId: string,
    patch: Partial<ProductAggregated>,
    storeId?: string | null,
  ) {
    try {
      ProductService.updateFirstPageCaches(storeId ?? null, (arr) => {
        const items = arr as ProductAggregated[];
        return items.map((p) =>
          String(p.id) === String(productId) ? { ...p, ...patch } : p,
        );
      });
      ProductService.updateFirstPageCaches(null, (arr) => {
        const items = arr as ProductAggregated[];
        return items.map((p) =>
          String(p.id) === String(productId) ? { ...p, ...patch } : p,
        );
      });
      const env = readCache<ProductAggregated[]>("rq:products:all", true);
      if (env?.data && Array.isArray(env.data)) {
        const next = env.data.map((p) =>
          String(p.id) === String(productId) ? { ...p, ...patch } : p,
        );
        writeCache("rq:products:all", next, CACHE_TTL.productsPage);
      }
    } catch { void 0; }
  }

  static async recomputeStoreCategoryFilterCache(storeId: string): Promise<void> {
    try {
      const names = await ProductService.getStoreCategoryFilterOptions(storeId);
      writeCache(`rq:filters:categories:${storeId}`, names, CACHE_TTL.categoryFilters);
    } catch { void 0; }
  }

  static async recomputeStoreCategoryFilterCacheBatch(storeIds: string[]): Promise<void> {
    const unique = Array.from(new Set((storeIds || []).map(String).filter(Boolean)));
    const tasks = unique.map((sid) => {
      const prev = ProductService.inFlightRecomputeByStore.get(sid);
      if (prev) return prev;
      const task = ProductService.recomputeStoreCategoryFilterCache(sid).finally(() => {
        try { ProductService.inFlightRecomputeByStore.delete(sid); } catch { /* ignore */ }
      });
      ProductService.inFlightRecomputeByStore.set(sid, task);
      return task;
    });
    await Promise.all(tasks);
  }

  static async getStoreCategoryFilterOptions(storeId: string): Promise<string[]> {
    const key = `rq:filters:categories:${storeId}`;
    const cached = readCache<string[]>(key, false);
    if (cached?.data && Array.isArray(cached.data)) return cached.data;

    const resp = await ProductService.invokeEdge<{ names?: string[] }>(
      "store-category-filter-options",
      { store_id: storeId },
    );
    const names = (resp?.names || []).filter((v) => typeof v === "string");
    writeCache(key, names, CACHE_TTL.categoryFilters);
    return names;
  }

  static async refreshStoreCategoryFilterOptions(storeIds: string[]): Promise<void> {
    const unique = Array.from(new Set((storeIds || []).map(String).filter(Boolean)));
    if (unique.length === 0) return;
    const resp = await ProductService.invokeEdge<{ results?: Record<string, string[]>; names?: string[] }>(
      "store-category-filter-options",
      { store_ids: unique },
    );
    const results: Record<string, string[]> = resp?.results || {};
    try {
      for (const sid of unique) {
        const names = Array.isArray(results[sid]) ? results[sid] : (resp?.names || []);
        writeCache(`rq:filters:categories:${sid}`, names, CACHE_TTL.categoryFilters);
      }
    } catch { void 0; }
  }

  /** Получить и обновить переопределения для пары (product_id, store_id) через product-edit-data */
  static async getStoreProductLink(
    productId: string,
    storeId: string,
  ): Promise<StoreProductLink | null> {
    const edit = await ProductService.getProductEditData(productId, storeId);
    return edit.link || null;
  }

  static async updateStoreProductLink(
    productId: string,
    storeId: string,
    patch: Partial<StoreProductLinkPatchInput>,
  ): Promise<StoreProductLink | null> {
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<{ link?: StoreProductLink | null } | string>(
      "update-store-product-link",
      {
        body: { product_id: productId, store_id: storeId, patch },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    );
    if (error) {
      const code = (error as { context?: { status?: number } } | null)?.context?.status;
      if (code === 403) throw new Error("Недостатньо прав");
      throw new Error((error as { message?: string } | null)?.message || "update_failed");
    }
    const resp = typeof data === "string" ? (JSON.parse(data) as { link?: StoreProductLink | null }) : (data as { link?: StoreProductLink | null });
    return resp?.link ?? null;
  }

  static async saveStoreProductEdit(
    productId: string,
    storeId: string,
    payload: {
      supplier_id?: number | string | null;
      category_id?: number | string | null;
      category_external_id?: string | null;
      currency_code?: string | null;
      external_id?: string | null;
      name?: string;
      name_ua?: string | null;
      vendor?: string | null;
      article?: string | null;
      available?: boolean;
      stock_quantity?: number;
      price?: number | null;
      price_old?: number | null;
      price_promo?: number | null;
      description?: string | null;
      description_ua?: string | null;
      docket?: string | null;
      docket_ua?: string | null;
      state?: string;
      images?: ProductImage[];
      params?: ProductParam[];
      linkPatch?: StoreProductLinkPatchInput;
    },
  ): Promise<{ product_id: string; link?: StoreProductLink | null } | null> {
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<{
      product_id?: string;
      link?: StoreProductLink | null;
    } | string>(
      "save-store-product-edit",
      {
        body: { product_id: productId, store_id: storeId, ...payload },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    );
    if (error) this.edgeError(error, "failed_save_product");
    const out =
      (typeof data === "string"
        ? (JSON.parse(data) as { product_id?: string; link?: StoreProductLink | null })
        : (data as { product_id?: string; link?: StoreProductLink | null }));
    const pid = out?.product_id ? String(out.product_id) : null;
    if (pid) {
      try {
        const patch: Partial<ProductAggregated> = {};
        if (payload.name !== undefined) patch.name = payload.name as string;
        if (payload.name_ua !== undefined) patch.name_ua = payload.name_ua ?? null;
        if (payload.price !== undefined) patch.price = payload.price ?? null;
        if (payload.price_old !== undefined) patch.price_old = payload.price_old ?? null;
        if (payload.price_promo !== undefined) patch.price_promo = payload.price_promo ?? null;
        if (payload.available !== undefined) patch.available = !!payload.available;
        if (payload.stock_quantity !== undefined) patch.stock_quantity = Number(payload.stock_quantity || 0);
        if (payload.category_id !== undefined) patch.category_id = (payload.category_id as number | null) ?? null;
        if (payload.category_external_id !== undefined) patch.category_external_id = payload.category_external_id ?? null;
        if (Array.isArray(payload.images)) {
          const main = (payload.images || []).find((i) => !!i.is_main) || (payload.images || [])[0];
          if (main?.url) patch.mainImageUrl = String(main.url);
        }
        ProductService.patchProductCaches(pid, patch, storeId);
        if (payload.linkPatch) {
          ProductService.invalidateStoreLinksCache(pid);
          try { await ProductService.recomputeStoreCategoryFilterCache(storeId); } catch { /* ignore */ }
        }
      } catch { void 0; }
    }
    return pid ? { product_id: pid, link: out.link } : null;
  }

  static async removeStoreProductLink(
    productId: string,
    storeId: string,
  ): Promise<void> {
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { error } = await supabase.functions.invoke<unknown>(
      "bulk-remove-store-product-links",
      {
        body: { product_ids: [productId], store_ids: [storeId] },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    );
    if (error) throw new Error((error as { message?: string } | null)?.message || "delete_failed");
    try {
      ProductService.clearAllFirstPageCaches();
    } catch { void 0; }
  }

  static async bulkRemoveStoreProductLinks(
    productIds: string[],
    storeIds: string[],
  ): Promise<{ deleted: number; deletedByStore: Record<string, number> }> {
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<{
      deleted?: number;
      deletedByStore?: Record<string, number>;
    } | string>(
      "bulk-remove-store-product-links",
      {
        body: { product_ids: productIds, store_ids: storeIds },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    );
    if (error) throw new Error((error as { message?: string } | null)?.message || "bulk_delete_failed");
    const out =
      (typeof data === "string"
        ? (JSON.parse(data) as { deleted?: number; deletedByStore?: Record<string, number> })
        : (data as { deleted?: number; deletedByStore?: Record<string, number> }));
    try {
      const sids = (storeIds || []).map(String);
      ProductService.updateFirstPageCaches(null, (arr) => {
        const items = arr as ProductAggregated[];
        return items.map((p) => {
          if (!productIds.map(String).includes(String(p.id))) return p;
          const next = (p.linkedStoreIds || []).filter((sid) => !sids.includes(String(sid)));
          return { ...p, linkedStoreIds: next };
        });
      });
      for (const sid of sids) {
        ProductService.updateFirstPageCaches(sid, (arr) => {
          const items = arr as ProductAggregated[];
          return items.map((p) => {
            if (!productIds.map(String).includes(String(p.id))) return p;
            const next = (p.linkedStoreIds || []).filter((x) => String(x) !== String(sid));
            return { ...p, linkedStoreIds: next };
          });
        });
      }
    } catch { void 0; }
    try {
      ProductService.clearAllFirstPageCaches();
    } catch { void 0; }
    return { deleted: out.deleted ?? 0, deletedByStore: out.deletedByStore ?? {} };
  }

  static async bulkAddStoreProductLinks(payload: Array<{
    product_id: string;
    store_id: string;
    is_active?: boolean;
    custom_price?: number | null;
    custom_price_old?: number | null;
    custom_price_promo?: number | null;
    custom_stock_quantity?: number | null;
    custom_available?: boolean | null;
  }>): Promise<{ inserted: number; addedByStore: Record<string, number> }> {
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<{
      inserted?: number;
      addedByStore?: Record<string, number>;
    } | string>(
      "bulk-add-store-product-links",
      {
        body: { links: payload },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    );
    if (error) throw new Error((error as { message?: string } | null)?.message || "bulk_insert_failed");
    const out =
      (typeof data === "string"
        ? (JSON.parse(data) as { inserted?: number; addedByStore?: Record<string, number> })
        : (data as { inserted?: number; addedByStore?: Record<string, number> }));
    try {
      const links = (payload || []).map((l) => ({ pid: String(l.product_id), sid: String(l.store_id) }));
      const groupedByPid: Record<string, string[]> = {};
      for (const { pid, sid } of links) {
        groupedByPid[pid] = Array.from(new Set([...(groupedByPid[pid] || []), sid]));
      }
      ProductService.updateFirstPageCaches(null, (arr) => {
        const items = arr as ProductAggregated[];
        return items.map((p) => {
          const add = groupedByPid[String(p.id)] || [];
          if (add.length === 0) return p;
          const merged = Array.from(new Set([...(p.linkedStoreIds || []).map(String), ...add]));
          return { ...p, linkedStoreIds: merged };
        });
      });
      const sidsUnique = Array.from(new Set(links.map((x) => x.sid)));
      for (const sid of sidsUnique) {
        ProductService.updateFirstPageCaches(sid, (arr) => {
          const items = arr as ProductAggregated[];
          return items.map((p) => {
            const add = groupedByPid[String(p.id)] || [];
            if (add.length === 0) return p;
            const merged = Array.from(new Set([...(p.linkedStoreIds || []).map(String), ...add]));
            return { ...p, linkedStoreIds: merged };
          });
        });
      }
      await ProductService.refreshStoreCategoryFilterOptions(sidsUnique);
    } catch { void 0; }
    return { inserted: out.inserted ?? 0, addedByStore: out.addedByStore ?? {} };
  }

  static async getStoreLinksForProduct(productId: string): Promise<string[]> {
    const cacheKey = `rq:links:product:${productId}`;
    const cached = readCache<string[]>(cacheKey, false);
    if (cached?.data && Array.isArray(cached.data)) return cached.data.map(String);

    const existing = ProductService.inFlightLinksByProduct.get(productId);
    if (existing) return existing;

    const task = (async () => {
      const payload = await ProductService.invokeEdge<{ store_ids?: string[] }>(
        "get-store-links-for-product",
        { product_id: productId },
      );
      const ids = Array.isArray(payload.store_ids)
        ? payload.store_ids.map(String)
        : [];
      writeCache(cacheKey, ids, CACHE_TTL.productLinks);
      return ids;
    })();

    ProductService.inFlightLinksByProduct.set(productId, task);
    try {
      return await task;
    } finally {
      ProductService.inFlightLinksByProduct.delete(productId);
    }
  }

  static invalidateStoreLinksCache(productId: string) {
    removeCache(`rq:links:product:${productId}`);
    try { ProductService.inFlightLinksByProduct.delete(productId); } catch { void 0; }
  }

  /** Максимальный лимит продуктов: через отдельную функцию get-product-limit-only */
  static async getProductLimitOnly(): Promise<number> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const subscription = await SubscriptionValidationService.getValidSubscription(
      user.id,
    );
    if (!subscription) {
      return 0;
    }
    const tariffId = subscription.tariffs?.id ?? subscription.tariff_id;
    if (!tariffId) {
      return 0;
    }

    const { data, error } = await supabase.functions.invoke<{ value?: number; max?: number } | string>(
      "get-product-limit-only",
      {
        body: { tariff_id: tariffId },
      },
    );
    if (error) {
      console.error("Error fetching product limit via function:", error);
      return 0;
    }
    const resp =
      (typeof data === "string" ? (JSON.parse(data) as { value?: number; max?: number }) : (data as { value?: number; max?: number }));
    const v = Number(resp?.value ?? resp?.max ?? 0);
    return Number.isFinite(v) ? v : 0;
  }

  /** Лимит продуктов для текущего пользователя */
  static async getProductLimit(): Promise<ProductLimitInfo> {
    const maxProducts = await this.getProductLimitOnly();
    const currentCount = await this.getProductsCount();

    return {
      current: currentCount,
      max: maxProducts,
      canCreate: currentCount < maxProducts,
    };
  }

  /** Количество продуктов текущего пользователя: только функция user-products-list */
  static async getProductsCount(): Promise<number> {
    try {
      const sessionValidation = await SessionValidator.ensureValidSession();
      if (!sessionValidation.isValid) {
        throw new Error(
          "Invalid session: " + (sessionValidation.error || "Session expired"),
        );
      }
      const resp = await ProductService.invokeEdge<ProductListResponseObj>(
        "user-products-list",
        { store_id: null, limit: 1, offset: 0 },
      );
      const page = (resp?.page || {}) as { total?: number };
      const total =
        typeof page.total === "number"
          ? page.total
          : Array.isArray(resp?.products)
          ? resp.products.length
          : 0;
      return total || 0;
    } catch (error) {
      console.error("Get products count error:", error);
      return 0;
    }
  }

  /** Полный список продуктов текущего пользователя (по функциям с пагинацией + кэш) */
  static async getProducts(): Promise<Product[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const cacheKey = "rq:products:all";
    const cached = readCache<ProductAggregated[]>(cacheKey, false);
    if (cached?.data && Array.isArray(cached.data)) return cached.data as unknown as Product[];

    const limit = 50;
    let offset = 0;
    let all: ProductAggregated[] = [];
    let hasMore = true;

    while (hasMore) {
      const resp = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", {
        store_id: null,
        limit,
        offset,
      });
      const products = Array.isArray(resp?.products) ? resp!.products! : [];
      const page: ProductListPage = {
        limit,
        offset,
        hasMore: !!resp?.page?.hasMore,
        nextOffset: resp?.page?.nextOffset ?? null,
        total: resp?.page?.total ?? products.length,
      };
      all = [...all, ...products];
      hasMore = !!page.hasMore;
      const nextOffset = page.nextOffset;
      if (nextOffset == null) break;
      offset = nextOffset;
      if (all.length >= 1000) break;
    }

    writeCache(cacheKey, all, CACHE_TTL.productsPage);
    return all as unknown as Product[];
  }

  /** Параметры товара: через product-edit-data */
  static async getProductParams(productId: string): Promise<ProductParam[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const edit = await ProductService.getProductEditData(productId);
    return edit.params || [];
  }

  /** Изображения товара: через product-edit-data */
  static async getProductImages(productId: string): Promise<ProductImage[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const edit = await ProductService.getProductEditData(productId);
    return edit.images || [];
  }

  /** Получение товара по ID: через product-edit-data */
  static async getProductById(id: string): Promise<Product | null> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const edit = await ProductService.getProductEditData(id);
    return edit.product || null;
  }

  /** Агрегированная загрузка данных для страницы редактирования товара */
  static async getProductEditData(
    productId: string,
    storeId?: string,
  ): Promise<{
    product: Product | null;
    link: StoreProductLink | null;
    images: ProductImage[];
    params: ProductParam[];
    supplier?: { id: number; supplier_name: string } | null;
    categoryName?: string | null;
    shop?: { id: string; store_name: string } | null;
    storeCategories?: Array<{
      store_category_id: number;
      category_id: number;
      name: string;
      store_external_id: string | null;
      is_active: boolean;
    }>;
    suppliers?: Array<{ id: string; supplier_name: string }>;
    currencies?: Array<{
      id: number;
      name: string;
      code: string;
      status: boolean | null;
    }>;
    categories?: Array<{
      id: string;
      name: string;
      external_id: string;
      supplier_id: string;
      parent_external_id: string | null;
    }>;
    supplierCategoriesMap?: Record<
      string,
      Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>
    >;
  }> {
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<
      | {
          product?: Product | null;
          link?: StoreProductLink | null;
          images?: ProductImage[];
          params?: ProductParam[];
          supplier?: { id: number; supplier_name: string } | null;
          categoryName?: string | null;
          shop?: { id: string; store_name: string } | null;
          storeCategories?: Array<{
            store_category_id: number;
            category_id: number;
            name: string;
            store_external_id: string | null;
            is_active: boolean;
          }>;
          suppliers?: Array<{ id: string; supplier_name: string }>;
          currencies?: Array<{ id: number; name: string; code: string; status: boolean | null }>;
          categories?: Array<{
            id: string;
            name: string;
            external_id: string;
            supplier_id: string;
            parent_external_id: string | null;
          }>;
          supplierCategoriesMap?: Record<string, Array<{
            id: string;
            name: string;
            external_id: string;
            supplier_id: string;
            parent_external_id: string | null;
          }>>;
        }
      | string
    >(
      "product-edit-data",
      {
        body: storeId
          ? { product_id: String(productId), store_id: String(storeId) }
          : { product_id: String(productId) },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      },
    );
    if (error) this.edgeError(error, "failed_load_product_edit");
    const resp = typeof data === "string" ? (JSON.parse(data) as {
      product?: Product | null;
      link?: StoreProductLink | null;
      images?: ProductImage[];
      params?: ProductParam[];
      supplier?: { id: number; supplier_name: string } | null;
      categoryName?: string | null;
      shop?: { id: string; store_name: string } | null;
      storeCategories?: Array<{
        store_category_id: number;
        category_id: number;
        name: string;
        store_external_id: string | null;
        is_active: boolean;
      }>;
      suppliers?: Array<{ id: string; supplier_name: string }>;
      currencies?: Array<{ id: number; name: string; code: string; status: boolean | null }>;
      categories?: Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>;
      supplierCategoriesMap?: Record<string, Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>>;
    }) : (data as {
      product?: Product | null;
      link?: StoreProductLink | null;
      images?: ProductImage[];
      params?: ProductParam[];
      supplier?: { id: number; supplier_name: string } | null;
      categoryName?: string | null;
      shop?: { id: string; store_name: string } | null;
      storeCategories?: Array<{
        store_category_id: number;
        category_id: number;
        name: string;
        store_external_id: string | null;
        is_active: boolean;
      }>;
      suppliers?: Array<{ id: string; supplier_name: string }>;
      currencies?: Array<{ id: number; name: string; code: string; status: boolean | null }>;
      categories?: Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>;
      supplierCategoriesMap?: Record<string, Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>>;
    });
    return {
      product: (resp?.product || null) as Product | null,
      link: (resp?.link || null) as StoreProductLink | null,
      images: (resp?.images || []) as ProductImage[],
      params: (resp?.params || []) as ProductParam[],
      supplier: (resp?.supplier || null) as {
        id: number;
        supplier_name: string;
      } | null,
      categoryName: (resp?.categoryName ?? null) as string | null,
      shop: (resp?.shop ?? null) as { id: string; store_name: string } | null,
      storeCategories: (resp?.storeCategories || []) as Array<{
        store_category_id: number;
        category_id: number;
        name: string;
        store_external_id: string | null;
        is_active: boolean;
      }>,
      suppliers: (resp?.suppliers || []) as Array<{
        id: string;
        supplier_name: string;
      }>,
      currencies: (resp?.currencies || []) as Array<{
        id: number;
        name: string;
        code: string;
        status: boolean | null;
      }>,
      categories: (resp?.categories || []) as Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>,
      supplierCategoriesMap: (resp?.supplierCategoriesMap ||
        {}) as Record<
        string,
        Array<{
          id: string;
          name: string;
          external_id: string;
          supplier_id: string;
          parent_external_id: string | null;
        }>
      >,
    };
  }

  /** Один продукт по ID */
  static async getProduct(id: string): Promise<Product> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error("Товар не найден");
    }
    return product;
  }

  /** Создание нового продукта (через функцию create-product) */
  static async createProduct(productData: CreateProductData): Promise<Product> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    let effectiveStoreId = productData.store_id;
    if (!effectiveStoreId || effectiveStoreId.trim() === "") {
      const storeIds = await this.getUserStoreIds();
      effectiveStoreId = storeIds[0];
      if (!effectiveStoreId) {
        throw new Error("Активний магазин не знайдено");
      }
    }

    const payload: Record<string, unknown> = {
      store_id: effectiveStoreId,
      supplier_id: this.castNullableNumber(productData.supplier_id),
      category_id: this.castNullableNumber(productData.category_id),
      category_external_id: productData.category_external_id ?? null,
      currency_code: productData.currency_code ?? null,
      external_id: productData.external_id ?? null,
      name: productData.name,
      name_ua: productData.name_ua ?? null,
      vendor: productData.vendor ?? null,
      article: productData.article ?? null,
      available:
        productData.available !== undefined ? productData.available : true,
      stock_quantity: productData.stock_quantity ?? 0,
      price: productData.price ?? null,
      price_old: productData.price_old ?? null,
      price_promo: productData.price_promo ?? null,
      description: productData.description ?? null,
      description_ua: productData.description_ua ?? null,
      docket: productData.docket ?? null,
      docket_ua: productData.docket_ua ?? null,
      state: productData.state ?? "new",
      images: (productData.images || []).map((img, index) => {
        const input = img as ImageInput;
        return {
          key: input.object_key || undefined,
          url: input.url,
          order_index: typeof input.order_index === "number" ? input.order_index : index,
          is_main: !!input.is_main,
        };
      }),
      params: (productData.params || []).map((p, index) => ({
        name: p.name,
        value: p.value,
        order_index:
          typeof p.order_index === "number" ? p.order_index : index,
        paramid: p.paramid ?? null,
        valueid: p.valueid ?? null,
      })),
      links: productData.links || undefined,
    };

    const respCreate = await ProductService.invokeEdge<{ product_id?: string }>(
      "create-product",
      payload,
    );
    const productId = respCreate?.product_id;
    if (!productId) throw new Error("create_failed");
    const product = await this.getProductById(productId);
    if (!product) throw new Error("create_failed");
    removeCache("rq:products:all");
    try {
      ProductService.clearAllFirstPageCaches();
    } catch { void 0; }
    return product;
  }

  static async duplicateProduct(id: string): Promise<Product> {
    const respDup = await ProductService.invokeEdge<{ product?: Product }>(
      "duplicate-product",
      { productId: id },
    );
    const product = respDup?.product as Product | undefined;
    if (!product) {
      throw new Error("duplicate_failed");
    }
    removeCache("rq:products:all");
    try {
      ProductService.clearAllFirstPageCaches();
    } catch { void 0; }
    return product;
  }

  /** Обновление товара через функцию update-product */
  static async updateProduct(id: string, productData: UpdateProductData): Promise<void> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const payload: Record<string, unknown> = {
      product_id: id,
      supplier_id:
        productData.supplier_id !== undefined
          ? this.castNullableNumber(productData.supplier_id)
          : undefined,
      category_id:
        productData.category_id !== undefined
          ? this.castNullableNumber(productData.category_id)
          : undefined,
      category_external_id:
        productData.category_external_id !== undefined
          ? productData.category_external_id
          : undefined,
      currency_code:
        productData.currency_code !== undefined
          ? productData.currency_code
          : undefined,
      external_id:
        productData.external_id !== undefined ? productData.external_id : undefined,
      name: productData.name !== undefined ? productData.name : undefined,
      name_ua: productData.name_ua !== undefined ? productData.name_ua : undefined,
      vendor: productData.vendor !== undefined ? productData.vendor : undefined,
      article: productData.article !== undefined ? productData.article : undefined,
      available:
        productData.available !== undefined ? productData.available : undefined,
      stock_quantity:
        productData.stock_quantity !== undefined
          ? productData.stock_quantity
          : undefined,
      price: productData.price !== undefined ? productData.price : undefined,
      price_old:
        productData.price_old !== undefined ? productData.price_old : undefined,
      price_promo:
        productData.price_promo !== undefined ? productData.price_promo : undefined,
      description:
        productData.description !== undefined ? productData.description : undefined,
      description_ua:
        productData.description_ua !== undefined
          ? productData.description_ua
          : undefined,
      docket: productData.docket !== undefined ? productData.docket : undefined,
      docket_ua:
        productData.docket_ua !== undefined ? productData.docket_ua : undefined,
      state: productData.state !== undefined ? productData.state : undefined,
      images:
        productData.images !== undefined
          ? (productData.images || []).map((img, index) => {
              const input = img as ImageInput;
              return {
                key: input.object_key || undefined,
                url: input.url,
                order_index: typeof input.order_index === "number" ? input.order_index : index,
                is_main: !!input.is_main,
              };
            })
          : undefined,
      params:
        productData.params !== undefined
          ? (productData.params || []).map((p, index) => ({
              name: p.name,
              value: p.value,
              order_index:
                typeof p.order_index === "number" ? p.order_index : index,
              paramid: p.paramid ?? null,
              valueid: p.valueid ?? null,
            }))
          : undefined,
    };

    const respUpdate = await ProductService.invokeEdge<{ product_id?: string }>(
      "update-product",
      payload,
    );
    const productId = respUpdate?.product_id || id;
    removeCache("rq:products:all");
    try {
      ProductService.clearAllFirstPageCaches();
    } catch { void 0; }
    void productId;
    return;
  }

  /** Удаление товара */
  static async deleteProduct(id: string): Promise<void> {
    const respDel = await ProductService.invokeEdge<{ success?: boolean }>(
      "delete-product",
      { product_ids: [String(id)] },
    );
    const ok = respDel?.success === true;
    if (!ok) {
      throw new Error("delete_failed");
    }
    removeCache("rq:products:all");
  }

  static async bulkDeleteProducts(ids: string[]): Promise<{ deleted: number }> {
    const validIds = Array.from(new Set(ids.map(String).filter(Boolean)));
    if (validIds.length === 0) return { deleted: 0 };
    const respDel2 = await ProductService.invokeEdge<{ success?: boolean }>(
      "delete-product",
      { product_ids: validIds },
    );
    const ok = respDel2?.success === true;
    if (!ok) throw new Error("delete_failed");
    removeCache("rq:products:all");
    try {
      ProductService.clearAllFirstPageCaches();
    } catch { void 0; }
    return { deleted: validIds.length };
  }

  static clearAllFirstPageCaches() {
    try {
      if (typeof window === "undefined") return;
      const prefix = "rq:products:first:";
      const keysToDelete: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        if (k.startsWith(prefix)) keysToDelete.push(k);
      }
      for (const key of keysToDelete) {
        removeCache(key);
      }
    } catch { void 0; }
  }
}
