import { supabase } from "@/integrations/supabase/client";
import { ApiError } from "./user-service";
import { SessionValidator } from "./session-validation";
import { SubscriptionValidationService } from "./subscription-validation-service";

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

export class ProductService {
  private static castNullableNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private static edgeError(error: any, fallbackKey: string): never {
    const status = (error?.context?.status ?? error?.status ?? error?.statusCode) as number | undefined;
    const message = (error?.message as string | undefined) || undefined;
    if (status === 403) throw new ApiError('permission_denied', 403, 'PERMISSION_DENIED');
    if (status === 400) throw new ApiError('products_limit_reached', 400, 'LIMIT_REACHED');
    if (status === 422) throw new ApiError('validation_error', 422, 'VALIDATION_ERROR');
    throw new ApiError(message || fallbackKey, status || 500);
  }
  /** Получение store_ids текущего пользователя */
  private static async getUserStoreIds(): Promise<string[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_stores')
        .select('id')
        .eq('user_id', sessionValidation.user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Get user stores error:', error);
        return [];
      }

      return (data || []).map((store: any) => store.id);
    } catch (error) {
      console.error('Get user stores error:', error);
      return [];
    }
  }

  /** Получение полной информации о магазинах пользователя */
  static async getUserStores(): Promise<any[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('user_stores')
      .select('id, user_id, store_name, store_url, template_id, custom_mapping, xml_config, is_active, created_at, updated_at, last_sync')
      .eq('user_id', sessionValidation.user.id)
      .eq('is_active', true)
      .order('store_name');

    if (error) {
      console.error('Get user stores error:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Получение продуктов для конкретного магазина с учётом переопределений из store_product_links */
  static async getProductsForStore(storeId: string): Promise<Product[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_product_links')
      .select('product_id,store_id,is_active,custom_name,custom_description,custom_price,custom_price_promo,custom_stock_quantity,custom_available,store_products(*)')
      .eq('store_id', storeId);

    if (error) {
      console.error('Get products for store error:', error);
      return [];
    }

    const rows = (data || []) as any[];
    const mapped: Product[] = rows.map((r: any) => {
      const base = r.store_products || {};
      return {
        id: String(base.id),
        store_id: String(r.store_id || base.store_id),
        supplier_id: base.supplier_id ?? null,
        external_id: base.external_id,
        name: r.custom_name ?? base.name,
        name_ua: base.name_ua ?? null,
        docket: base.docket ?? null,
        docket_ua: base.docket_ua ?? null,
        description: r.custom_description ?? base.description ?? null,
        description_ua: base.description_ua ?? null,
        vendor: base.vendor ?? null,
        article: base.article ?? null,
        category_id: base.category_id ?? null,
        category_external_id: base.category_external_id ?? null,
        currency_id: base.currency_id ?? null,
        currency_code: base.currency_code ?? null,
        price: r.custom_price ?? base.price ?? null,
        price_old: base.price_old ?? null,
        price_promo: r.custom_price_promo ?? base.price_promo ?? null,
        stock_quantity: (r.custom_stock_quantity ?? base.stock_quantity ?? 0) as number,
        available: (r.custom_available ?? base.available ?? true) as boolean,
        state: base.state ?? 'new',
        created_at: base.created_at ?? new Date().toISOString(),
        updated_at: base.updated_at ?? new Date().toISOString(),
        is_active: r.is_active === true,
      };
    });

    return mapped;
  }

  static async getProductsAggregated(storeId?: string | null): Promise<ProductAggregated[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const payload: Record<string, unknown> = { store_id: storeId ?? null };
    try {
      const { data, error } = await (supabase as any).functions.invoke('user-products-list', {
        body: payload,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (error) throw error;
      const rows = (data as unknown as { products?: ProductAggregated[] })?.products || [];
      return rows as ProductAggregated[];
    } catch (err) {
      // Fallback: агрегируем на клиенте параллельно, чтобы UI не ломался, если функция не доступна
      // Минимизируем количество запросов и исключаем последовательность
      const baseProducts: Product[] = storeId
        ? await (async () => {
            const { data, error } = await (supabase as any)
              .from('store_product_links')
              .select('product_id,store_id,is_active,custom_name,custom_description,custom_price,custom_price_promo,custom_stock_quantity,custom_available,store_products(*)')
              .eq('store_id', storeId);
            if (error) return [] as Product[];
            const rows = (data || []) as Array<{
              product_id: string;
              store_id: string;
              is_active?: boolean | null;
              custom_name?: string | null;
              custom_description?: string | null;
              custom_price?: number | null;
              custom_price_promo?: number | null;
              custom_stock_quantity?: number | null;
              custom_available?: boolean | null;
              store_products?: Product | null;
            }>;
            return rows.map((r) => {
              const base = (r.store_products || {}) as Product;
              return {
                id: String(base.id),
                store_id: String(r.store_id || base.store_id),
                supplier_id: base.supplier_id ?? null,
                external_id: base.external_id,
                name: r.custom_name ?? base.name,
                name_ua: base.name_ua ?? null,
                docket: base.docket ?? null,
                docket_ua: base.docket_ua ?? null,
                description: r.custom_description ?? base.description ?? null,
                description_ua: base.description_ua ?? null,
                vendor: base.vendor ?? null,
                article: base.article ?? null,
                category_id: base.category_id ?? null,
                category_external_id: base.category_external_id ?? null,
                currency_id: base.currency_id ?? null,
                currency_code: base.currency_code ?? null,
                price: r.custom_price ?? base.price ?? null,
                price_old: base.price_old ?? null,
                price_promo: r.custom_price_promo ?? base.price_promo ?? null,
                stock_quantity: (r.custom_stock_quantity ?? base.stock_quantity ?? 0) as number,
                available: (r.custom_available ?? base.available ?? true) as boolean,
                state: base.state ?? 'new',
                created_at: base.created_at ?? new Date().toISOString(),
                updated_at: base.updated_at ?? new Date().toISOString(),
                is_active: r.is_active === true,
              } as Product;
            });
          })()
        : await (async () => {
            const { data, error } = await (supabase as any)
              .from('store_products')
              .select('*')
              .order('created_at', { ascending: false });
            if (error) return [] as Product[];
            return (data || []) as Product[];
          })();

      const ids = baseProducts.map((p) => p.id).filter(Boolean);
      const categoryIds = baseProducts.map((p) => p.category_id).filter((v) => v != null) as number[];
      const externalCategoryIds = baseProducts.map((p) => p.category_external_id).filter((v) => !!v) as string[];
      const supplierIdsRaw = baseProducts.map((p) => p.supplier_id).filter((v) => v != null) as number[];
      const supplierIds = Array.from(new Set(supplierIdsRaw));

      const [imgRows, catRows, extCatRows, supRows, linkRows, paramRows] = await Promise.all([
        ids.length
          ? (supabase as any)
              .from('store_product_images')
              .select('product_id,url,is_main,order_index')
              .in('product_id', ids)
              .then((r: any) => r.data || [])
          : Promise.resolve([]),
        categoryIds.length
          ? (supabase as any)
              .from('store_categories')
              .select('id,name')
              .in('id', categoryIds)
              .then((r: any) => r.data || [])
          : Promise.resolve([]),
        externalCategoryIds.length
          ? (supabase as any)
              .from('store_categories')
              .select('external_id,name')
              .in('external_id', externalCategoryIds)
              .then((r: any) => r.data || [])
          : Promise.resolve([]),
        supplierIds.length
          ? (supabase as any)
              .from('user_suppliers')
              .select('id,supplier_name')
              .in('id', supplierIds as any)
              .then((r: any) => r.data || [])
          : Promise.resolve([]),
        !storeId && ids.length
          ? (supabase as any)
              .from('store_product_links')
              .select('product_id,store_id,is_active')
              .in('product_id', ids)
              .then((r: any) => r.data || [])
          : Promise.resolve([]),
        ids.length
          ? (supabase as any)
              .from('store_product_params')
              .select('product_id,name,value')
              .in('product_id', ids)
              .in('name', ['docket', 'docket_ua'])
              .then((r: any) => r.data || [])
          : Promise.resolve([]),
      ]);

      const mainImageMap: Record<string, string> = {};
      const grouped: Record<string, Array<{ product_id: string; url?: string; is_main?: boolean; order_index?: number }>> = {};
      for (const r of imgRows as Array<{ product_id: string; url?: string; is_main?: boolean; order_index?: number }>) {
        const pid = String(r.product_id);
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push(r);
      }
      for (const [pid, rows] of Object.entries(grouped)) {
        const main = rows.find((x) => x.is_main) || rows.sort((a, b) => (Number(a.order_index ?? 999) - Number(b.order_index ?? 999)))[0];
        if (main?.url) mainImageMap[pid] = String(main.url);
      }

      const categoryNameMap: Record<string, string> = {};
      for (const r of catRows as Array<{ id: number; name: string }>) {
        if (r.id != null && r.name) categoryNameMap[String(r.id)] = String(r.name);
      }
      for (const r of extCatRows as Array<{ external_id: string; name: string }>) {
        if (r.external_id && r.name) categoryNameMap[String(r.external_id)] = String(r.name);
      }

      const supplierNameMap: Record<string | number, string> = {};
      for (const r of supRows as Array<{ id: number; supplier_name: string }>) {
        if (r.id != null && r.supplier_name) supplierNameMap[r.id] = String(r.supplier_name);
      }

      const storeLinksByProduct: Record<string, string[]> = {};
      for (const r of linkRows as Array<{ product_id: string | number; store_id?: string | number; is_active?: boolean }>) {
        const pid = String(r.product_id);
        const sid = r?.store_id != null ? String(r.store_id) : '';
        const active = r?.is_active !== false;
        if (!storeLinksByProduct[pid]) storeLinksByProduct[pid] = [];
        if (sid && active) storeLinksByProduct[pid].push(sid);
      }

      const paramsMap: Record<string, Record<string, string>> = {};
      for (const pr of paramRows as Array<{ product_id: string | number; name: string; value: string }>) {
        const pid = String(pr.product_id);
        if (!paramsMap[pid]) paramsMap[pid] = {};
        paramsMap[pid][String(pr.name)] = String(pr.value);
      }

      const aggregated: ProductAggregated[] = baseProducts.map((p) => {
        const pid = String(p.id);
        const docket = p.docket ?? paramsMap[pid]?.['docket'] ?? null;
        const docketUa = p.docket_ua ?? paramsMap[pid]?.['docket_ua'] ?? null;
        return {
          ...p,
          docket,
          docket_ua: docketUa,
          mainImageUrl: mainImageMap[pid],
          categoryName:
            (p.category_id != null ? categoryNameMap[String(p.category_id)] : undefined) ||
            (p.category_external_id ? categoryNameMap[String(p.category_external_id)] : undefined),
          supplierName: p.supplier_id != null ? supplierNameMap[p.supplier_id] : undefined,
          linkedStoreIds: storeLinksByProduct[pid] || [],
        } as ProductAggregated;
      });

      return aggregated;
    }
  }

  static async getProductsFirstPage(storeId: string | null, limit: number): Promise<{ products: ProductAggregated[]; page: { limit: number; offset: number; hasMore: boolean; nextOffset: number | null; total: number } }> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const sizedKey = `rq:products:first:${storeId ?? 'all'}:${limit}`;
    const genericKey = `rq:products:first:${storeId ?? 'all'}`;
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(sizedKey) || window.localStorage.getItem(genericKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { items: ProductAggregated[]; page: { limit: number; offset: number; hasMore: boolean; nextOffset: number | null; total: number }; expiresAt: number };
        if (parsed && Array.isArray(parsed.items) && parsed.page && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
          const timeLeft = parsed.expiresAt - Date.now();
          const threshold = 2 * 60 * 1000;
          if (timeLeft < threshold) {
            (async () => {
              try {
                const { data: authData } = await (supabase as any).auth.getSession();
                const accessToken: string | null = authData?.session?.access_token || null;
                const payload: Record<string, unknown> = { store_id: storeId ?? null, limit, offset: 0 };
                const timeoutMs = 4000;
                const invokePromise = (supabase as any).functions.invoke('user-products-list', {
                  body: payload,
                  headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                });
                const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
                const respAny = await Promise.race([invokePromise, timeoutPromise]);
                let out: { products: ProductAggregated[]; page: { limit: number; offset: number; hasMore: boolean; nextOffset: number | null; total: number } } | null = null;
                if (respAny && typeof respAny === 'object' && respAny !== null && !(respAny as any).error) {
                  const respData = typeof (respAny as any).data === 'string' ? JSON.parse((respAny as any).data) : ((respAny as any).data as any);
                  const productsN = (respData?.products || []) as ProductAggregated[];
                  const pageN = (respData?.page || { limit, offset: 0, hasMore: false, nextOffset: null, total: productsN.length }) as { limit: number; offset: number; hasMore: boolean; nextOffset: number | null; total: number };
                  out = { products: productsN, page: pageN };
                }
                if (out) {
                  try {
                    const payloadStore = JSON.stringify({ items: out.products, page: out.page, expiresAt: Date.now() + 900_000 });
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(sizedKey, payloadStore);
                      window.localStorage.setItem(genericKey, payloadStore);
                    }
                  } catch { void 0; }
                }
              } catch { void 0; }
            })();
          }
          return { products: parsed.items, page: parsed.page };
        }
      }
    } catch { void 0; }

    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const payload: Record<string, unknown> = { store_id: storeId ?? null, limit, offset: 0 };
    const { data, error } = await (supabase as any).functions.invoke('user-products-list', {
      body: payload,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) ProductService.edgeError(error, 'user-products-list');
    const resp = typeof data === 'string' ? JSON.parse(data) : (data as any);
    const products = (resp?.products || []) as ProductAggregated[];
    const page = (resp?.page || { limit, offset: 0, hasMore: false, nextOffset: null, total: products.length }) as { limit: number; offset: number; hasMore: boolean; nextOffset: number | null; total: number };
    try {
      const payloadStore = JSON.stringify({ items: products, page, expiresAt: Date.now() + 900_000 });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(sizedKey, payloadStore);
        window.localStorage.setItem(genericKey, payloadStore);
      }
    } catch { void 0; }
    return { products, page };
  }

  static updateFirstPageCaches(storeId: string | null, mutate: (items: unknown[]) => unknown[]) {
    try {
      if (typeof window === 'undefined') return;
      const prefix = `rq:products:first:${storeId ?? 'all'}`;
      const keysToUpdate: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        if (k === prefix || k.startsWith(`${prefix}:`)) keysToUpdate.push(k);
      }
      for (const key of keysToUpdate) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as { items: unknown[]; page?: unknown; expiresAt: number };
        if (!Array.isArray(parsed.items)) continue;
        const nextItems = mutate(parsed.items);
        const payload = JSON.stringify({ items: nextItems, page: parsed.page, expiresAt: parsed.expiresAt });
        window.localStorage.setItem(key, payload);
      }
    } catch { /* noop */ }
  }

  static patchProductCaches(productId: string, patch: Partial<ProductAggregated>, storeId?: string | null) {
    try {
      ProductService.updateFirstPageCaches(storeId ?? null, (arr) => {
        const items = arr as ProductAggregated[];
        return items.map((p) => (String(p.id) === String(productId) ? { ...p, ...patch } : p));
      });
      ProductService.updateFirstPageCaches(null, (arr) => {
        const items = arr as ProductAggregated[];
        return items.map((p) => (String(p.id) === String(productId) ? { ...p, ...patch } : p));
      });
      if (typeof window !== 'undefined') {
        const key = 'rq:products:all';
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { items: ProductAggregated[]; expiresAt: number };
          if (parsed && Array.isArray(parsed.items)) {
            const next = parsed.items.map((p) => (String(p.id) === String(productId) ? { ...p, ...patch } : p));
            const payload = JSON.stringify({ items: next, expiresAt: parsed.expiresAt });
            window.localStorage.setItem(key, payload);
          }
        }
      }
    } catch {}
  }

  /** Получить и обновить переопределения для пары (product_id, store_id) */
  static async getStoreProductLink(productId: string, storeId: string): Promise<any | null> {
    const { data, error } = await (supabase as any)
      .from('store_product_links')
      .select('*')
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.error('Get store product link error:', error);
    }
    return data || null;
  }

  static async updateStoreProductLink(productId: string, storeId: string, patch: any): Promise<any> {
    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await (supabase as any).functions.invoke('update-store-product-link', {
      body: { product_id: productId, store_id: storeId, patch },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) {
      const code = (error as unknown as { context?: { status?: number } })?.context?.status;
      if (code === 403) throw new Error('Недостатньо прав');
      throw new Error((error as unknown as { message?: string })?.message || 'update_failed');
    }
    return (data as unknown as { link?: any })?.link ?? null;
  }

  static async removeStoreProductLink(productId: string, storeId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('store_product_links')
      .delete()
      .eq('product_id', productId)
      .eq('store_id', storeId);
    if (error) {
      console.error('Delete store product link error:', error);
      throw new Error(error.message);
    }
  }

  /** Получение только максимального лимита продуктов (без подсчета текущих) */
  static async getProductLimitOnly(): Promise<number> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Use cached/validated subscription to avoid duplicate requests
    const subscription = await SubscriptionValidationService.getValidSubscription(user.id);
    if (!subscription) {
      return 0;
    }
    const tariffId = subscription.tariffs?.id ?? subscription.tariff_id;
    if (!tariffId) {
      return 0;
    }

    // Get the product limit directly from tariff_limits by limit_name
    const { data: limitData, error: limitError } = await supabase
      .from('tariff_limits')
      .select('value')
      .eq('tariff_id', tariffId)
      .ilike('limit_name', '%товар%')
      .eq('is_active', true)
      .maybeSingle();

    if (limitError) {
      console.error('Error fetching tariff limit:', limitError);
      return 0;
    }

    return limitData?.value || 0;
  }

  /** Получение лимита продуктов для текущего пользователя */
  static async getProductLimit(): Promise<ProductLimitInfo> {
    const maxProducts = await this.getProductLimitOnly();
    const currentCount = await this.getProductsCount();

    return {
      current: currentCount,
      max: maxProducts,
      canCreate: currentCount < maxProducts
    };
  }

  /** Получение количества продуктов текущего пользователя */
  static async getProductsCount(): Promise<number> {
    try {
      const sessionValidation = await SessionValidator.ensureValidSession();
      if (!sessionValidation.isValid) {
        throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
      }

      const { count, error } = await (supabase as any)
        .from('store_products')
        .select('id', { count: 'exact', head: true })
        // RLS should restrict rows to the current user's stores; no explicit user_id column
        // Keep the query simple to avoid referencing non-existent columns
        .order('id', { ascending: true });

      if (error) {
        console.error('Get products count error:', error);
        // Возвращаем 0 вместо выброса ошибки для случая пустой таблицы
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Get products count error (table may not exist):', error);
      // Возвращаем 0 если таблица не существует или нет доступа
      return 0;
    }
  }

  /** Получение списка продуктов текущего пользователя */
  static async getProducts(): Promise<Product[]> {
    try {
      const sessionValidation = await SessionValidator.ensureValidSession();
      if (!sessionValidation.isValid) {
        throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
      }

      const { data, error } = await (supabase as any)
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get products error:', error);
        // Возвращаем пустой массив вместо выброса ошибки для случая пустой таблицы
        return [];
      }

      const rows: any[] = data || [];
      // Fallback: если колонок docket/docket_ua нет в таблице, читаем значения из store_product_params
      const ids = rows.map((r: any) => r?.id).filter((v) => !!v);
      if (ids.length > 0) {
        const { data: paramRows, error: paramsErr } = await (supabase as any)
          .from('store_product_params')
          .select('product_id,name,value')
          .in('product_id', ids)
          .in('name', ['docket', 'docket_ua']);
        if (!paramsErr && Array.isArray(paramRows)) {
          const map: Record<string, Record<string, string>> = {};
          for (const pr of paramRows) {
            const pid = String(pr.product_id);
            if (!map[pid]) map[pid] = {} as any;
            map[pid][pr.name] = pr.value;
          }
          rows.forEach((r: any) => {
            const pid = String(r.id);
            if ((r.docket == null || r.docket === '') && map[pid]?.docket) {
              r.docket = map[pid].docket;
            }
            if ((r.docket_ua == null || r.docket_ua === '') && map[pid]?.docket_ua) {
              r.docket_ua = map[pid].docket_ua;
            }
          });
        }
      }

      return rows as Product[];
    } catch (error) {
      console.error('Get products error (table may not exist):', error);
      // Возвращаем пустой массив если таблица не существует или нет доступа
      return [];
    }
  }

  /** Получение параметров товара */
  static async getProductParams(productId: string): Promise<ProductParam[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_product_params')
      .select('*')
      .eq('product_id', productId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Get product params error:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Получение изображений товара */
  static async getProductImages(productId: string): Promise<ProductImage[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_product_images')
      .select('*')
      .eq('product_id', productId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Get product images error:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Получение товара по ID */
  static async getProductById(id: string): Promise<Product | null> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Товар не найден
      }
      console.error('Get product by ID error:', error);
      throw new Error(error.message);
    }

    const product: any = data;
    // Fallback: читаем возможные значения docket/docket_ua из параметров, если отсутствуют в основной таблице
    try {
      const { data: paramRows } = await (supabase as any)
        .from('store_product_params')
        .select('name,value')
        .eq('product_id', product.id)
        .in('name', ['docket', 'docket_ua']);
      (paramRows || []).forEach((pr: any) => {
        if (pr.name === 'docket' && (product.docket == null || product.docket === '')) {
          product.docket = pr.value;
        }
        if (pr.name === 'docket_ua' && (product.docket_ua == null || product.docket_ua === '')) {
          product.docket_ua = pr.value;
        }
      });
    } catch (_) {
      // ignore
    }

    return product as Product;
  }

  /** Получение одного продукта по ID - используем getProductById */
  static async getProduct(id: string): Promise<Product> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error("Товар не найден");
    }
    return product;
  }

  /** Создание нового продукта */
  static async createProduct(productData: CreateProductData): Promise<Product> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    let effectiveStoreId = productData.store_id;
    if (!effectiveStoreId || effectiveStoreId.trim() === '') {
      const storeIds = await this.getUserStoreIds();
      effectiveStoreId = storeIds[0];
      if (!effectiveStoreId) {
        throw new Error("Активний магазин не знайдено");
      }
    }

    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;

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
      available: productData.available !== undefined ? productData.available : true,
      stock_quantity: productData.stock_quantity ?? 0,
      price: productData.price ?? null,
      price_old: productData.price_old ?? null,
      price_promo: productData.price_promo ?? null,
      description: productData.description ?? null,
      description_ua: productData.description_ua ?? null,
      docket: productData.docket ?? null,
      docket_ua: productData.docket_ua ?? null,
      state: productData.state ?? 'new',
      images: (productData.images || []).map((img, index) => ({
        key: (img as any)?.object_key || undefined,
        url: img.url,
        order_index: typeof (img as any).order_index === 'number' ? (img as any).order_index : index,
        is_main: !!(img as any).is_main,
      })),
      params: (productData.params || []).map((p, index) => ({
        name: p.name,
        value: p.value,
        order_index: typeof p.order_index === 'number' ? p.order_index : index,
        paramid: p.paramid ?? null,
        valueid: p.valueid ?? null,
      })),
      links: (productData as any).links || undefined,
    };

    const { data, error } = await (supabase as any).functions.invoke('create-product', {
      body: payload,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) this.edgeError(error, 'failed_create_product');
    const productId = (data as unknown as { product_id?: string })?.product_id;
    if (!productId) throw new Error('create_failed');
    const product = await this.getProductById(productId);
    if (!product) throw new Error('create_failed');
    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:products:all'); } catch {}
    return product;
  }

  static async duplicateProduct(id: string): Promise<Product> {
    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await (supabase as any).functions.invoke('duplicate-product', { body: { productId: id }, headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined });
    if (error) this.edgeError(error, 'failed_duplicate_product');
    const product = (data as any)?.product as Product;
    if (!product) {
      throw new Error('duplicate_failed');
    }
    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:products:all'); } catch {}
    return product;
  }

  /** Обновление товара */
  static async updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;

    const payload: Record<string, unknown> = {
      product_id: id,
      supplier_id: productData.supplier_id !== undefined ? this.castNullableNumber(productData.supplier_id) : undefined,
      category_id: productData.category_id !== undefined ? this.castNullableNumber(productData.category_id) : undefined,
      category_external_id: productData.category_external_id !== undefined ? productData.category_external_id : undefined,
      currency_code: productData.currency_code !== undefined ? productData.currency_code : undefined,
      external_id: productData.external_id !== undefined ? productData.external_id : undefined,
      name: productData.name !== undefined ? productData.name : undefined,
      name_ua: productData.name_ua !== undefined ? productData.name_ua : undefined,
      vendor: productData.vendor !== undefined ? productData.vendor : undefined,
      article: productData.article !== undefined ? productData.article : undefined,
      available: productData.available !== undefined ? productData.available : undefined,
      stock_quantity: productData.stock_quantity !== undefined ? productData.stock_quantity : undefined,
      price: productData.price !== undefined ? productData.price : undefined,
      price_old: productData.price_old !== undefined ? productData.price_old : undefined,
      price_promo: productData.price_promo !== undefined ? productData.price_promo : undefined,
      description: productData.description !== undefined ? productData.description : undefined,
      description_ua: productData.description_ua !== undefined ? productData.description_ua : undefined,
      docket: productData.docket !== undefined ? productData.docket : undefined,
      docket_ua: productData.docket_ua !== undefined ? productData.docket_ua : undefined,
      state: productData.state !== undefined ? productData.state : undefined,
      images: productData.images !== undefined ? (productData.images || []).map((img, index) => ({
        key: (img as any)?.object_key || undefined,
        url: (img as any)?.url,
        order_index: typeof (img as any).order_index === 'number' ? (img as any).order_index : index,
        is_main: !!(img as any).is_main,
      })) : undefined,
      params: productData.params !== undefined ? (productData.params || []).map((p, index) => ({
        name: p.name,
        value: p.value,
        order_index: typeof p.order_index === 'number' ? p.order_index : index,
        paramid: p.paramid ?? null,
        valueid: p.valueid ?? null,
      })) : undefined,
    };

    const { data, error } = await (supabase as any).functions.invoke('update-product', {
      body: payload,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) this.edgeError(error, 'failed_save_product');
    const productId = (data as unknown as { product_id?: string })?.product_id || id;
    const product = await this.getProductById(productId);
    if (!product) throw new Error('update_failed');
    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:products:all'); } catch {}
    return product;
  }

  /** Удаление товара */
  static async deleteProduct(id: string): Promise<void> {
    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await (supabase as any).functions.invoke('delete-product', {
      body: { productId: id },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) this.edgeError(error, 'failed_delete_product');
    const ok = (data as unknown as { success?: boolean })?.success === true;
    if (!ok) {
      throw new Error('delete_failed');
    }
    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:products:all'); } catch {}
  }
}
