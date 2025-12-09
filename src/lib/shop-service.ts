import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SessionValidator } from "./session-validation";
import { CACHE_TTL, readCache, writeCache, removeCache } from "./cache-utils";

export interface Shop {
  id: string; // UUID
  user_id: string;
  store_name: string;
  store_company?: string | null;
  store_url?: string | null;
  template_id?: string | null;
  xml_config?: Json | null;
  custom_mapping?: Json | null;
  marketplace?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShopData {
  store_name: string;
  store_company?: string | null;
  store_url?: string | null;
  template_id?: string | null;
  xml_config?: Json | null;
  custom_mapping?: Json | null;
}

export interface UpdateShopData {
  store_name?: string;
  store_company?: string | null;
  store_url?: string | null;
  template_id?: string | null;
  xml_config?: Json | null;
  custom_mapping?: Json | null;
  is_active?: boolean;
}

export interface ShopLimitInfo {
  current: number;
  max: number;
  canCreate: boolean;
}

export interface ShopAggregated extends Shop {
  marketplace?: string;
  productsCount?: number;
  categoriesCount?: number;
}

export class ShopService {
  private static inFlightShopsAggregated: Promise<ShopAggregated[]> | null = null;
  private static readonly SHOPS_CACHE_KEY = "rq:shopsList";

  private static isOffline(): boolean {
    try {
      return typeof navigator !== "undefined" && navigator.onLine === false;
    } catch {
      return false;
    }
  }

  private static readShopsCache(allowStale: boolean): { items: ShopAggregated[]; expiresAt: number } | null {
    const env = readCache<ShopAggregated[]>(ShopService.SHOPS_CACHE_KEY, allowStale);
    if (env?.data && Array.isArray(env.data)) return { items: env.data, expiresAt: env.expiresAt };
    try {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(ShopService.SHOPS_CACHE_KEY);
      if (!raw) return null;
      const legacy = JSON.parse(raw) as { items?: ShopAggregated[]; expiresAt?: number };
      if (legacy && Array.isArray(legacy.items) && typeof legacy.expiresAt === "number") {
        writeCache(ShopService.SHOPS_CACHE_KEY, legacy.items, CACHE_TTL.shopsList);
        return { items: legacy.items, expiresAt: legacy.expiresAt };
      }
    } catch { /* ignore */ }
    return null;
  }

  private static edgeError(error: unknown, code: string): never {
    const msg = (error as { message?: string } | null)?.message || code;
    throw new Error(msg);
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
    const token = await ShopService.getAccessToken();
    const { data, error } = await supabase.functions.invoke<T | string>(name, {
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (error) ShopService.edgeError(error, name);
    const resp = typeof data === "string" ? (JSON.parse(data as unknown as string) as T) : (data as T);
    return resp;
  }

  private static writeShopsCache(items: ShopAggregated[]): void {
    writeCache(ShopService.SHOPS_CACHE_KEY, items, CACHE_TTL.shopsList);
  }

  private static updateShopsCache(mutator: (items: ShopAggregated[]) => ShopAggregated[]) {
    const env = readCache<ShopAggregated[]>(ShopService.SHOPS_CACHE_KEY, true);
    if (!env?.data || !Array.isArray(env.data)) return;
    const nextItems = mutator(env.data);
    writeCache(ShopService.SHOPS_CACHE_KEY, nextItems, CACHE_TTL.shopsList);
  }

  static bumpProductsCountInCache(storeId: string, delta: number) {
    ShopService.updateShopsCache((items) =>
      items.map((s) =>
        s.id === storeId
          ? { ...s, productsCount: Math.max(0, (s.productsCount ?? 0) + delta) }
          : s,
      ),
    );
  }

  static bumpCategoriesCountInCache(storeId: string, delta: number) {
    ShopService.updateShopsCache((items) =>
      items.map((s) =>
        s.id === storeId
          ? { ...s, categoriesCount: Math.max(0, (s.categoriesCount ?? 0) + delta) }
          : s,
      ),
    );
  }

  static setCategoriesCountInCache(storeId: string, nextCount: number) {
    ShopService.updateShopsCache((items) =>
      items.map((s) => {
        if (s.id !== storeId) return s;
        const products = s.productsCount ?? 0;
        const guarded = products === 0 ? 0 : Math.max(0, Number(nextCount) || 0);
        return { ...s, categoriesCount: guarded };
      }),
    );
  }

  /** Получение только максимального лимита магазинов (без подсчета текущих) */
  static async getShopLimitOnly(): Promise<number> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    const resp = await ShopService.invokeEdge<{ value?: number }>("get-shop-limit-only", {});
    return Number(resp.value ?? 0) || 0;
  }

  /** Получение лимита магазинов для текущего пользователя */
  static async getShopLimit(): Promise<ShopLimitInfo> {
    const maxShops = await this.getShopLimitOnly();
    const currentCount = await this.getShopsCount();

    return {
      current: currentCount,
      max: maxShops,
      canCreate: currentCount < maxShops,
    };
  }

  /** Получение количества магазинов текущего пользователя */
  static async getShopsCount(): Promise<number> {
    if (ShopService.isOffline()) {
      return 0;
    }
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    const resp = await ShopService.invokeEdge<{ shops?: unknown[] }>("user-shops-list", {});
    const arr = Array.isArray(resp.shops) ? (resp.shops as unknown[]) : [];
    return arr.length;
  }

  /** Получение списка магазинов текущего пользователя */
  static async getShops(): Promise<Shop[]> {
    if (ShopService.isOffline()) {
      return [];
    }
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    const payload = await ShopService.invokeEdge<Record<string, unknown>>("user-shops-list", {});
    const rows = Array.isArray((payload as { shops?: Shop[] }).shops)
      ? ((payload as { shops?: Shop[] }).shops as Shop[])
      : [];
    return rows as Shop[];
  }

  static async getShopsAggregated(): Promise<ShopAggregated[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // Быстрый путь: на страницах, где не требуется свежие данные, используем валидный кэш
    try {
      if (typeof window !== "undefined") {
        const p = window.location.pathname.toLowerCase();
        const requireFresh = p.includes("/user/shops");
        const cached = ShopService.readShopsCache(false);
        if (!requireFresh && cached?.items && Array.isArray(cached.items)) {
          return cached.items;
        }
      }
    } catch {
    }

    // Offline → только кэш
    if (ShopService.isOffline()) {
      const cached = ShopService.readShopsCache(true);
      return cached?.items ?? [];
    }

    // Свежий кэш → используем как fallback, но всё равно обновляем с сервера
    const fresh = ShopService.readShopsCache(false);
    const cachedItems = fresh?.items && Array.isArray(fresh.items) ? fresh.items : null;

    // Уже есть in-flight запрос → переиспользуем
    if (ShopService.inFlightShopsAggregated) {
      return ShopService.inFlightShopsAggregated;
    }

    const task = (async () => {
      try {
        const normalized = await ShopService.invokeEdge<{ shops?: ShopAggregated[] }>(
          "user-shops-list",
          {},
        );
        const rows = Array.isArray(normalized?.shops) ? (normalized!.shops as ShopAggregated[]) : [];
        ShopService.writeShopsCache(rows);
        return rows;
      } catch {
        if (cachedItems) return cachedItems;
        const rows = await ShopService.getShopsAggregatedFallback();
        ShopService.writeShopsCache(rows);
        return rows;
      }
    })();

    ShopService.inFlightShopsAggregated = task;
    try {
      return await task;
    } finally {
      ShopService.inFlightShopsAggregated = null;
    }
  }

  private static async getShopsAggregatedFallback(): Promise<ShopAggregated[]> {
    const baseShops: Shop[] = await this.getShops();
    return baseShops.map((s) => ({
      ...s,
      marketplace: "Не вказано",
      productsCount: 0,
      categoriesCount: 0,
    }));
  }

  /** Получение одного магазина по ID */
  static async getShop(id: string): Promise<Shop> {
    if (!id) throw new Error("Shop ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = (authData?.session?.access_token as string | null) || null;
    const payload = await ShopService.invokeEdge<Record<string, unknown>>("user-shops-list", {
      store_id: id,
      includeConfig: true,
    });
    const rows = Array.isArray((payload as { shops?: Shop[] }).shops)
      ? ((payload as { shops?: Shop[] }).shops as Shop[])
      : [];
    const shop = rows[0] as Shop | undefined;
    if (!shop) throw new Error("Shop not found");
    return shop;
  }

  /** Создание нового магазина */
  static async createShop(shopData: CreateShopData): Promise<Shop> {
    if (!shopData.store_name?.trim()) {
      throw new Error("Назва магазину обов'язкова");
    }

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

    const limitInfo = await this.getShopLimit();
    if (!limitInfo.canCreate) {
      throw new Error(`Досягнуто ліміту магазинів (${limitInfo.max}). Оновіть тарифний план.`);
    }

    const resp = await ShopService.invokeEdge<{ shop?: Shop }>("create-shop", {
      store_name: shopData.store_name.trim(),
      template_id: shopData.template_id ?? null,
      xml_config: shopData.xml_config ?? null,
      custom_mapping: shopData.custom_mapping ?? null,
      store_company: shopData.store_company ?? null,
      store_url: shopData.store_url ?? null,
    });
    removeCache(ShopService.SHOPS_CACHE_KEY);
    return (resp.shop as Shop);
  }

  /** Обновление магазина */
  static async updateShop(id: string, shopData: UpdateShopData): Promise<Shop> {
    if (!id) throw new Error("Shop ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const cleanData: Record<string, unknown> = {};
    if (shopData.store_name !== undefined) {
      if (!shopData.store_name.trim()) {
        throw new Error("Назва магазину обов'язкова");
      }
      cleanData.store_name = shopData.store_name.trim();
    }
    if (shopData.store_company !== undefined) {
      cleanData.store_company = shopData.store_company ?? null;
    }
    if (shopData.store_url !== undefined) {
      cleanData.store_url = shopData.store_url ?? null;
    }
    if (shopData.template_id !== undefined) {
      cleanData.template_id = shopData.template_id || null;
    }
    if (shopData.xml_config !== undefined) {
      cleanData.xml_config = shopData.xml_config || null;
    }
    if (shopData.custom_mapping !== undefined) {
      cleanData.custom_mapping = shopData.custom_mapping || null;
    }
    if (shopData.is_active !== undefined) {
      cleanData.is_active = shopData.is_active;
    }

    if (Object.keys(cleanData).length === 0) {
      throw new Error("No fields to update");
    }

    cleanData.updated_at = new Date().toISOString();

    const resp = await ShopService.invokeEdge<{ shop?: Shop }>("update-shop", { id, patch: cleanData });
    removeCache(ShopService.SHOPS_CACHE_KEY);
    return (resp.shop as Shop);
  }

  /** Удаление магазина */
  static async deleteShop(id: string): Promise<void> {
    if (!id) throw new Error("Shop ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    await ShopService.invokeEdge<{ ok: boolean }>("delete-shop", { id });
    removeCache(ShopService.SHOPS_CACHE_KEY);
  }

  /** Категории магазина: объединённые данные ssc + sc */
  static async getStoreCategories(storeId: string): Promise<
    Array<{
      store_category_id: number;
      store_id: string;
      category_id: number;
      name: string;
      base_external_id: string | null;
      parent_external_id: string | null;
      base_rz_id: string | null;
      store_external_id: string | null;
      store_rz_id_value: string | null;
      is_active: boolean;
    }>
  > {
    if (!storeId) throw new Error("Store ID is required");
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) throw new Error("Invalid session");

    const resp = await ShopService.invokeEdge<{ rows?: Array<Record<string, unknown>> }>(
      "store-categories-list",
      { store_id: storeId },
    );
    const rows = (resp?.rows || []) as Array<Record<string, unknown>>;
    return rows.map((r) => {
      const sc = ((r as Record<string, unknown>).store_categories as Record<string, unknown> | undefined) || {};
      return {
        store_category_id: Number((r as Record<string, unknown>).id),
        store_id: String((r as Record<string, unknown>).store_id),
        category_id: Number((r as Record<string, unknown>).category_id),
        name: String(((r as Record<string, unknown>).custom_name ?? sc["name"] ?? "")),
        base_external_id: (sc["external_id"] as string | null) ?? null,
        parent_external_id: (sc["parent_external_id"] as string | null) ?? null,
        base_rz_id: (sc["rz_id"] as string | null) ?? null,
        store_external_id: ((r as Record<string, unknown>).external_id as string | null) ?? null,
        store_rz_id_value: ((r as Record<string, unknown>).rz_id_value as string | null) ?? null,
        is_active: !!(r as Record<string, unknown>).is_active,
      };
    });
  }

  /** Обновление полей категории магазина */
  static async updateStoreCategory(payload: {
    id: number;
    rz_id_value?: string | null;
    is_active?: boolean;
    custom_name?: string | null;
    external_id?: string | null;
  }): Promise<void> {
    if (!payload?.id) throw new Error("Category row id is required");
    const clean: Record<string, unknown> = {};
    if (payload.rz_id_value !== undefined) clean.rz_id_value = payload.rz_id_value;
    if (payload.is_active !== undefined) clean.is_active = !!payload.is_active;
    if (payload.custom_name !== undefined) clean.custom_name = payload.custom_name ?? null;
    if (payload.external_id !== undefined) clean.external_id = payload.external_id ?? null;

    await ShopService.invokeEdge<unknown>("update-store-category", { id: payload.id, patch: clean });
  }

  /** Удаление категории магазина и всех её товаров в магазине */
  static async deleteStoreCategoryWithProducts(
    storeId: string,
    categoryId: number,
  ): Promise<void> {
    if (!storeId || !categoryId) throw new Error("storeId and categoryId required");
    await ShopService.invokeEdge<unknown>("delete-store-category-with-products", { store_id: storeId, category_id: categoryId });
  }

  /** Массовое удаление категорий магазина и их товаров */
  static async deleteStoreCategoriesWithProducts(
    storeId: string,
    categoryIds: number[],
  ): Promise<void> {
    if (!storeId || !Array.isArray(categoryIds) || categoryIds.length === 0) return;
    const ids = categoryIds;
    await ShopService.invokeEdge<unknown>("delete-store-categories-with-products", { store_id: storeId, category_ids: ids });
  }

  /** Убедиться, что категория привязана к магазину (апсерт) */
  static async ensureStoreCategory(
    storeId: string,
    categoryId: number,
    options?: { external_id?: string | null; custom_name?: string | null },
  ): Promise<number | null> {
    if (!storeId || !Number.isFinite(categoryId)) throw new Error("storeId and categoryId required");
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) throw new Error("Invalid session");

    const resp = await ShopService.invokeEdge<{ id?: number | string }>("ensure-store-category", {
      store_id: storeId,
      category_id: Number(categoryId),
      external_id: options?.external_id ?? null,
      custom_name: options?.custom_name ?? null,
    });
    return resp?.id != null ? Number(resp.id) : null;
  }

  /** Получить внешний ID категории магазина для пары (store_id, category_id) */
  static async getStoreCategoryExternalId(
    storeId: string,
    categoryId: number,
  ): Promise<string | null> {
    if (!storeId || !Number.isFinite(categoryId)) throw new Error("storeId and categoryId required");
    const resp = await ShopService.invokeEdge<{ external_id?: string | null }>("get-store-category-external-id", {
      store_id: storeId,
      category_id: categoryId,
    });
    return resp?.external_id ?? null;
  }

  static async cleanupUnusedStoreCategory(storeId: string, categoryId: number): Promise<void> {
    if (!storeId || !Number.isFinite(categoryId)) return;
    await ShopService.invokeEdge<unknown>("cleanup-unused-store-category", { store_id: storeId, category_id: categoryId });
  }

  /** Валюты магазина */
  static async getStoreCurrencies(storeId: string): Promise<Array<{ code: string; rate: number; is_base: boolean }>> {
    const resp = await ShopService.invokeEdge<{ rows?: Array<{ code: string; rate?: number; is_base?: boolean }> }>(
      "store-currencies-list",
      { store_id: storeId },
    );
    const rows = (resp?.rows || []) as Array<{ code: string; rate?: number; is_base?: boolean }>;
    return rows.map((r) => ({ code: String(r.code), rate: Number(r.rate ?? 1), is_base: !!r.is_base }));
  }

  static async addStoreCurrency(storeId: string, code: string, rate: number): Promise<void> {
    await ShopService.invokeEdge<unknown>("add-store-currency", { store_id: storeId, code, rate });
  }

  static async updateStoreCurrencyRate(storeId: string, code: string, rate: number): Promise<void> {
    await ShopService.invokeEdge<unknown>("update-store-currency-rate", { store_id: storeId, code, rate });
  }

  static async setBaseStoreCurrency(storeId: string, code: string): Promise<void> {
    await ShopService.invokeEdge<unknown>("set-base-store-currency", { store_id: storeId, code });
  }

  static async deleteStoreCurrency(storeId: string, code: string): Promise<void> {
    await ShopService.invokeEdge<unknown>("delete-store-currency", { store_id: storeId, code });
  }

  static async getAvailableCurrencies(): Promise<Array<{ code: string; rate?: number }>> {
    const resp = await ShopService.invokeEdge<{ rows?: Array<{ code: string; rate?: number }> }>("get-available-currencies", {});
    const rows = (resp.rows || []) as Array<{ code: string; rate?: number }>;
    return rows.map((c) => ({ code: String(c.code), rate: typeof c.rate === "number" ? c.rate : undefined }));
  }

  static async getStoreProductsCount(storeId: string): Promise<number> {
    const resp = await ShopService.invokeEdge<{ count?: number }>("get-store-products-count", { store_id: storeId });
    return Number(resp.count ?? 0) || 0;
  }
}
