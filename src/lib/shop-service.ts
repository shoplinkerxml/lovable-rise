import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SessionValidator } from "./session-validation";

// ============================================================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ============================================================================

export interface Shop {
  id: string;
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
  marketplace?: string | null;
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

export interface ShopSettingsAggregated {
  shop: Shop;
  productsCount: number;
  storeCurrencies: Array<{ code: string; rate: number; is_base: boolean }>;
  availableCurrencies: Array<{ code: string; rate?: number }>;
  marketplaces: string[];
  categories: StoreCategory[];
}

export interface StoreCategory {
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
}

// Типизированные ответы API
interface EdgeResponse<T> {
  data?: T;
  error?: string;
}

interface ShopsListResponse {
  shops: ShopAggregated[];
  totalShops?: number;
  limit?: number;
}

interface ShopLimitOnlyResponse {
  totalShops: number;
  limit: number;
}

interface ShopResponse {
  shop: Shop;
}

interface CategoryRow {
  id: number;
  store_id: string;
  category_id: number;
  custom_name?: string | null;
  external_id?: string | null;
  rz_id_value?: string | null;
  is_active: boolean;
  store_categories?: {
    name?: string;
    external_id?: string | null;
    parent_external_id?: string | null;
    rz_id?: string | null;
  };
}

// ============================================================================
// ОСНОВНОЙ КЛАСС СЕРВИСА
// ============================================================================

export class ShopService {
  // Дедупликация запросов
  private static requestCache = new Map<string, Promise<any>>();
  
  // Кэш данных (простой in-memory)
  private static dataCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 30000; // 30 секунд
  private static readonly PERSISTED_SHOPS_CACHE_TTL = 10 * 60 * 1000;
  private static readonly PERSISTED_SHOPS_CACHE_PREFIX = "shops-aggregated:";
  private static lastUserId: string | null = null;

  // ============================================================================
  // ПРИВАТНЫЕ УТИЛИТЫ
  // ============================================================================

  private static isOffline(): boolean {
    return typeof navigator !== "undefined" && !navigator.onLine;
  }

  private static async ensureSession(): Promise<void> {
    const validation = await SessionValidator.ensureValidSession();
    if (!validation.isValid) {
      throw new Error(`Session invalid: ${validation.error || "Session expired"}`);
    }
  }

  private static async getAccessToken(): Promise<string> {
    await this.ensureSession();
    
    const { data: authData, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Failed to get session: ${error.message}`);
    
    const token = authData?.session?.access_token;
    if (!token) throw new Error("No access token available");
    
    return token;
  }

  private static handleEdgeError(error: unknown, functionName: string): never {
    console.error(`Edge function "${functionName}" failed:`, error);

    let message = `${functionName} failed`;
    let status: number | undefined;
    
    if (error && typeof error === "object") {
      const err = error as Record<string, any>;
      
      if (err.message) message = err.message;
      
      try {
        const context = err.context;
        if (context) {
          status = typeof context.status === "number" ? context.status : undefined;
          const body = context.body || context.error;
          if (body) {
            const parsed = typeof body === "string" ? JSON.parse(body) : body;
            const serverMessage = parsed?.message || parsed?.error;
            if (serverMessage) message = `${functionName}: ${serverMessage}`;
          }
        }
      } catch (parseError) {
        console.warn("Could not parse error details:", parseError);
      }
    }

    // Добавляем статус код к сообщению
    if (status) {
      const statusMessages: Record<number, string> = {
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
      };
      const statusText = statusMessages[status] || status;
      if (!message.includes(String(status))) {
        message = `${message} (${statusText})`;
      }
    }

    throw new Error(message);
  }

  private static async invokeEdge<T>(
    functionName: string,
    body: Record<string, unknown> = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) this.handleEdgeError(error, functionName);
    if (!data) throw new Error(`${functionName} returned no data`);

    return typeof data === "string" ? JSON.parse(data) : data;
  }

  /**
   * Дедупликация запросов - предотвращает множественные идентичные запросы
   */
  private static async deduplicateRequest<T>(
    key: string,
    request: () => Promise<T>
  ): Promise<T> {
    const existing = this.requestCache.get(key);
    if (existing) return existing;

    const promise = request().finally(() => {
      this.requestCache.delete(key);
    });

    this.requestCache.set(key, promise);
    return promise;
  }

  /**
   * Простое кэширование данных
   */
  private static getCached<T>(key: string): T | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.dataCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private static setCache(key: string, data: any): void {
    this.dataCache.set(key, { data, timestamp: Date.now() });
  }

  private static clearCache(pattern?: string): void {
    if (!pattern) {
      this.dataCache.clear();
      return;
    }
    
    for (const key of this.dataCache.keys()) {
      if (key.includes(pattern)) {
        this.dataCache.delete(key);
      }
    }
  }

  private static getPersistedShopsKey(userId: string): string {
    return `${this.PERSISTED_SHOPS_CACHE_PREFIX}${userId}`;
  }

  private static async getSessionUserId(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id ? String(data.session.user.id) : null;
      if (userId) this.lastUserId = userId;
      return userId;
    } catch {
      return null;
    }
  }

  private static getPersistedShops(userId: string): ShopAggregated[] | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const raw = window.localStorage.getItem(this.getPersistedShopsKey(userId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { timestamp?: number; shops?: ShopAggregated[] };
      const timestamp = Number(parsed?.timestamp ?? 0) || 0;
      if (!timestamp) return null;
      if (Date.now() - timestamp > this.PERSISTED_SHOPS_CACHE_TTL) return null;
      const shops = parsed?.shops;
      if (!Array.isArray(shops)) return null;
      return shops;
    } catch {
      return null;
    }
  }

  private static setPersistedShops(userId: string, shops: ShopAggregated[]): void {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.setItem(
        this.getPersistedShopsKey(userId),
        JSON.stringify({ timestamp: Date.now(), shops })
      );
    } catch {
      return;
    }
  }

  private static clearPersistedShops(userId: string): void {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.removeItem(this.getPersistedShopsKey(userId));
    } catch {
      return;
    }
  }

  private static async clearShopsCaches(): Promise<void> {
    this.clearCache("shops");
    this.clearCache("shops-aggregated");
    this.clearCache("shop-limit");
    this.clearCache("shop-limit-info");
    const userId = this.lastUserId ?? (await this.getSessionUserId());
    if (userId) this.clearPersistedShops(userId);
    try {
      const { UserAuthService } = await import("@/lib/user-auth-service");
      UserAuthService.clearAuthMeCache();
    } catch {
      void 0;
    }
  }

  /**
   * Обновление счетчиков в кэше
   */
  private static updateShopCounters(
    storeId: string,
    update: (shop: ShopAggregated) => Partial<ShopAggregated>
  ): void {
    const cacheKey = "shops-aggregated";
    const cached = this.getCached<ShopAggregated[]>(cacheKey);
    
    if (!cached) return;
    
    const updated = cached.map(shop =>
      shop.id === storeId ? { ...shop, ...update(shop) } : shop
    );
    
    this.setCache(cacheKey, updated);

    const userId = this.lastUserId;
    if (!userId) return;

    const persisted = this.getPersistedShops(userId);
    if (!persisted) return;

    const persistedUpdated = persisted.map(shop =>
      shop.id === storeId ? { ...shop, ...update(shop) } : shop
    );
    this.setPersistedShops(userId, persistedUpdated);
  }

  /**
   * Fallback для получения магазинов без агрегированных данных.
   * Используется когда основной endpoint недоступен.
   */
  private static async getShopsFallback(): Promise<ShopAggregated[]> {
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes?.user) return [];
      const userId = String(userRes.user.id);
      if (!userId) return [];
      
      const { data: rows, error } = await supabase
        .from("user_stores")
        .select("id, user_id, store_name, store_company, store_url, template_id, xml_config, custom_mapping, is_active, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error || !Array.isArray(rows)) return [];
      
      return (rows as any[]).map((shop) => ({
        id: String(shop.id),
        user_id: String(shop.user_id),
        store_name: String(shop.store_name || ""),
        store_company: shop.store_company ?? null,
        store_url: shop.store_url ?? null,
        template_id: shop.template_id ?? null,
        xml_config: shop.xml_config ?? null,
        custom_mapping: shop.custom_mapping ?? null,
        marketplace: "Не вказано",
        is_active: Boolean(shop.is_active),
        created_at: String(shop.created_at || ""),
        updated_at: String(shop.updated_at || ""),
        productsCount: 0,
        categoriesCount: 0,
      }));
    } catch {
      return [];
    }
  }

  // ============================================================================
  // ПУБЛИЧНЫЕ МЕТОДЫ - УПРАВЛЕНИЕ МАГАЗИНАМИ
  // ============================================================================

  static async getShopLimit(): Promise<ShopLimitInfo> {
    if (this.isOffline()) return { current: 0, max: 3, canCreate: true };

    const cacheKey = "shop-limit-info";
    const cached = this.getCached<ShopLimitInfo>(cacheKey);
    if (cached) return cached;

    await this.ensureSession();

    try {
      const response = await this.invokeEdge<ShopLimitOnlyResponse>(
        "user-shops-list",
        { limitOnly: true }
      );
      const current = Math.max(0, Number(response.totalShops) || 0);
      const max = Math.max(3, Number(response.limit) || 0);
      const info = { current, max, canCreate: current < max };
      this.setCache(cacheKey, info);
      this.setCache("shop-limit", max);
      return info;
    } catch {
      return { current: 0, max: 3, canCreate: true };
    }
  }

  static async getShopLimitOnly(): Promise<number> {
    const cacheKey = "shop-limit";
    const cached = this.getCached<number>(cacheKey);
    if (cached) return cached;

    const info = await this.getShopLimit();
    this.setCache(cacheKey, info.max);
    return info.max;
  }

  static async getShopsCount(): Promise<number> {
    if (this.isOffline()) return 0;
    const info = await this.getShopLimit();
    return info.current;
  }

  static async getShopsCountCached(): Promise<number> {
    return this.getShopsCount();
  }

  static async getShops(): Promise<Shop[]> {
    if (this.isOffline()) return [];

    await this.ensureSession();
    
    const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {});
    return response.shops || [];
  }

  /**
   * Получение агрегированных данных магазинов с кэшированием и fallback.
   */
  static async getShopsAggregated(options?: { force?: boolean }): Promise<ShopAggregated[]> {
    const force = options?.force === true
    const cacheKey = "shops-aggregated";

    if (!force) {
      const cached = this.getCached<ShopAggregated[]>(cacheKey);
      if (cached) return cached;
    }

    if (!force) {
      try {
        const validation = await SessionValidator.ensureValidSession();
        if (validation.isValid && validation.user?.id) {
          const sessionKey = `${validation.user.id}:${validation.expiresAt ?? 0}`;
          const raw = typeof window !== "undefined" ? window.localStorage?.getItem(`rq:authMe:${sessionKey}`) : null;
          if (raw) {
            const parsed = JSON.parse(raw) as any;
            const stores = parsed?.data?.userStores;
            if (Array.isArray(stores) && stores.length > 0) {
              const lite = stores.map((s: any) => ({
                id: String(s.id),
                user_id: String(validation.user!.id),
                store_name: String(s.store_name || ""),
                store_company: null,
                store_url: null,
                template_id: null,
                xml_config: null,
                custom_mapping: null,
                marketplace: "Не вказано",
                is_active: true,
                created_at: "",
                updated_at: "",
                productsCount: 0,
                categoriesCount: 0,
              })) as ShopAggregated[];
              this.setCache(cacheKey, lite);
              return lite;
            }
          }
        }
      } catch {
        void 0;
      }
    }

    const userId = await this.getSessionUserId();
    if (!force && userId && this.isOffline()) {
      const persisted = this.getPersistedShops(userId);
      if (persisted) {
        this.setCache(cacheKey, persisted);
        return persisted;
      }
    }

    if (this.isOffline()) return [];

    await this.ensureSession();

    return this.deduplicateRequest(cacheKey, async () => {
      try {
        const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {});
        const shops = response.shops || [];
        const limit = Number(response.limit ?? NaN);
        if (Number.isFinite(limit)) {
          const current = Math.max(
            0,
            Number(response.totalShops ?? shops.length) || 0
          );
          const max = Math.max(3, limit || 0);
          const info = { current, max, canCreate: current < max };
          this.setCache("shop-limit-info", info);
          this.setCache("shop-limit", info.max);
        }
        this.setCache(cacheKey, shops);
        if (userId) this.setPersistedShops(userId, shops);
        return shops;
      } catch (error) {
        console.error("Failed to fetch aggregated shops, using fallback:", error);
        const fallback = await this.getShopsFallback();
        return fallback;
      }
    });
  }

  static async getShop(id: string): Promise<Shop> {
    if (!id) throw new Error("Shop ID is required");

    await this.ensureSession();

    const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {
      store_id: id,
      includeConfig: true,
    });

    const shop = response.shops?.[0];
    if (!shop) throw new Error(`Shop with ID ${id} not found`);

    return shop;
  }

  static async getShopLite(id: string): Promise<ShopAggregated> {
    if (!id) throw new Error("Shop ID is required");

    await this.ensureSession();

    const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {
      store_id: id,
      includeConfig: false,
    });

    const shop = response.shops?.[0];
    if (!shop) throw new Error(`Shop with ID ${id} not found`);

    return shop;
  }

  static async getShopSettingsAggregated(storeId: string): Promise<ShopSettingsAggregated> {
    if (!storeId) throw new Error("Store ID is required");
    
    await this.ensureSession();

    const response = await this.invokeEdge<ShopSettingsAggregated>(
      "shop-settings-aggregated",
      { store_id: storeId }
    );

    return {
      shop: response.shop,
      productsCount: Number(response.productsCount ?? 0),
      storeCurrencies: (response.storeCurrencies || []).map(r => ({
        code: String(r.code),
        rate: Number(r.rate ?? 1),
        is_base: Boolean(r.is_base),
      })),
      availableCurrencies: (response.availableCurrencies || []).map(r => ({
        code: String(r.code),
        rate: r.rate != null ? Number(r.rate) : undefined,
      })),
      marketplaces: (response.marketplaces || []).map(String),
      categories: (response.categories || []).map(row => ({
        store_category_id: Number(row.store_category_id),
        store_id: String(row.store_id),
        category_id: Number(row.category_id),
        name: String(row.name || ""),
        base_external_id: row.base_external_id ?? null,
        parent_external_id: row.parent_external_id ?? null,
        base_rz_id: row.base_rz_id ?? null,
        store_external_id: row.store_external_id ?? null,
        store_rz_id_value: row.store_rz_id_value ?? null,
        is_active: Boolean(row.is_active),
      })),
    };
  }

  static async createShop(shopData: CreateShopData): Promise<Shop> {
    const storeName = shopData.store_name?.trim();
    if (!storeName) throw new Error("Назва магазину обов'язкова");

    await this.ensureSession();

    try {
      const response = await this.invokeEdge<ShopResponse>("create-shop", {
        store_name: storeName,
        template_id: shopData.template_id ?? null,
        xml_config: shopData.xml_config ?? null,
        custom_mapping: shopData.custom_mapping ?? null,
        store_company: shopData.store_company ?? null,
        store_url: shopData.store_url ?? null,
        marketplace: shopData.marketplace ?? null,
      });
      
      // Очищаем кэш после создания
      await this.clearShopsCaches();
      
      return response.shop;
    } catch (e) {
      const msg = String((e as { message?: string })?.message || "");
      if (/limit|400|LIMIT_REACHED/i.test(msg)) {
        const max = await this.getShopLimitOnly();
        throw new Error(`Досягнуто ліміту магазинів (${max}). Оновіть тарифний план.`);
      }
      throw e;
    }
  }

  static async updateShop(id: string, shopData: UpdateShopData): Promise<Shop> {
    if (!id) throw new Error("Shop ID is required");

    await this.ensureSession();

    // Подготовка данных для обновления
    const patch: Record<string, unknown> = {};

    if (shopData.store_name !== undefined) {
      const trimmed = shopData.store_name.trim();
      if (!trimmed) throw new Error("Назва магазину обов'язкова");
      patch.store_name = trimmed;
    }

    if (shopData.store_company !== undefined) {
      patch.store_company = shopData.store_company ?? null;
    }

    if (shopData.store_url !== undefined) {
      patch.store_url = shopData.store_url ?? null;
    }

    if (shopData.template_id !== undefined) {
      patch.template_id = shopData.template_id || null;
    }

    if (shopData.xml_config !== undefined) {
      patch.xml_config = shopData.xml_config || null;
    }

    if (shopData.custom_mapping !== undefined) {
      patch.custom_mapping = shopData.custom_mapping || null;
    }

    // is_active - boolean, нельзя конвертировать в null
    if (shopData.is_active !== undefined) {
      patch.is_active = shopData.is_active;
    }

    if (Object.keys(patch).length === 0) {
      throw new Error("No fields to update");
    }

    patch.updated_at = new Date().toISOString();

    const response = await this.invokeEdge<ShopResponse>("update-shop", { id, patch });
    
    // Очищаем кэш после обновления
    await this.clearShopsCaches();
    
    return response.shop;
  }

  static async deleteShop(id: string): Promise<void> {
    if (!id) throw new Error("Shop ID is required");

    await this.ensureSession();

    try {
      await this.invokeEdge<{ ok: boolean }>("delete-shop", { id });
      await this.clearShopsCaches();
    } catch (e) {
      const msg = String((e as { message?: string })?.message || "");
      
      // Ошибки аутентификации - сразу пробрасываем
      if (/401|Unauthorized|403|Forbidden/i.test(msg)) throw e;
      
      // Конфликт зависимостей - очищаем и повторяем
      if (/409|Conflict/i.test(msg)) {
        await this.cleanupShopDependencies(id);
        await this.invokeEdge<{ ok: boolean }>("delete-shop", { id });
        await this.clearShopsCaches();
      } else {
        throw e;
      }
    }
  }

  /**
   * Очистка зависимостей магазина перед удалением
   */
  private static async cleanupShopDependencies(storeId: string): Promise<void> {
    try {
      // Удаляем товары
      const { ProductService } = await import("@/lib/product-service");
      const products = await ProductService.getProductsAggregated(storeId);
      const productIds = products.map(p => String(p.id)).filter(Boolean);
      
      if (productIds.length > 0) {
        await ProductService.bulkRemoveStoreProductLinks(productIds, [storeId]);
      }
      
      // Удаляем категории
      const categories = await this.getStoreCategories(storeId);
      const categoryIds = categories.map(c => c.store_category_id).filter(Number.isFinite);
      
      if (categoryIds.length > 0) {
        await this.deleteStoreCategoriesWithProducts(storeId, categoryIds);
      }
    } catch (error) {
      console.warn("Failed to cleanup shop dependencies:", error);
    }
  }

  // ============================================================================
  // ОПТИМИСТИЧНЫЕ ОБНОВЛЕНИЯ СЧЕТЧИКОВ
  // ============================================================================

  static bumpProductsCountInCache(storeId: string, delta: number): void {
    this.updateShopCounters(storeId, shop => ({
      productsCount: Math.max(0, (shop.productsCount || 0) + delta),
    }));
  }

  static bumpCategoriesCountInCache(storeId: string, delta: number): void {
    this.updateShopCounters(storeId, shop => ({
      categoriesCount: Math.max(0, (shop.categoriesCount || 0) + delta),
    }));
  }

  static setProductsCountInCache(storeId: string, count: number): void {
    const finalCount = Math.max(0, Number(count) || 0);
    this.updateShopCounters(storeId, shop => ({
      productsCount: finalCount,
      categoriesCount: finalCount === 0 ? 0 : shop.categoriesCount,
    }));
  }

  static setCategoriesCountInCache(storeId: string, count: number): void {
    this.updateShopCounters(storeId, shop => {
      const productsCount = shop.productsCount || 0;
      return {
        categoriesCount: productsCount === 0 ? 0 : Math.max(0, count),
      };
    });
  }

  static async recomputeStoreCounts(
    storeId: string
  ): Promise<{ productsCount: number; categoriesCount: number }> {
    if (!storeId) return { productsCount: 0, categoriesCount: 0 };
    
    await this.ensureSession();

    const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {
      store_id: storeId,
      includeConfig: false,
      forceCounts: true,
    });

    const shop = (response.shops || []).find(
      (s) => String(s.id) === String(storeId)
    );

    const productsCount = Math.max(0, Number(shop?.productsCount ?? 0));
    const categoriesCount =
      productsCount === 0
        ? 0
        : Math.max(0, Number(shop?.categoriesCount ?? 0));

    this.updateShopCounters(storeId, () => ({
      productsCount,
      categoriesCount,
    }));

    return { productsCount, categoriesCount };
  }

  static async getStoreProductsCount(storeId: string): Promise<number> {
    if (!storeId) return 0;
    
    try {
      const { productsCount } = await this.recomputeStoreCounts(storeId);
      return productsCount;
    } catch (error) {
      console.warn("getStoreProductsCount failed:", error);
      return 0;
    }
  }

  // ============================================================================
  // КАТЕГОРИИ МАГАЗИНА
  // ============================================================================

  static async getStoreCategories(storeId: string): Promise<StoreCategory[]> {
    if (!storeId) throw new Error("Store ID is required");

    await this.ensureSession();

    const response = await this.invokeEdge<{ rows: CategoryRow[] }>(
      "store-categories-list",
      { store_id: storeId }
    );

    return (response.rows || []).map(row => ({
      store_category_id: row.id,
      store_id: row.store_id,
      category_id: row.category_id,
      name: row.custom_name || row.store_categories?.name || "",
      base_external_id: row.store_categories?.external_id || null,
      parent_external_id: row.store_categories?.parent_external_id || null,
      base_rz_id: row.store_categories?.rz_id || null,
      store_external_id: row.external_id || null,
      store_rz_id_value: row.rz_id_value || null,
      is_active: row.is_active,
    }));
  }

  static async updateStoreCategory(payload: {
    id: number;
    rz_id_value?: string | null;
    is_active?: boolean;
    custom_name?: string | null;
    external_id?: string | null;
  }): Promise<void> {
    if (!payload?.id) throw new Error("Category ID is required");

    const patch: Record<string, unknown> = {};

    if (payload.rz_id_value !== undefined) {
      patch.rz_id_value = payload.rz_id_value;
    }
    if (payload.is_active !== undefined) {
      patch.is_active = payload.is_active;
    }
    if (payload.custom_name !== undefined) {
      patch.custom_name = payload.custom_name;
    }
    if (payload.external_id !== undefined) {
      patch.external_id = payload.external_id;
    }

    await this.invokeEdge("update-store-category", { id: payload.id, patch });
  }

  static async deleteStoreCategoryWithProducts(
    storeId: string,
    categoryId: number
  ): Promise<void> {
    if (!storeId || !categoryId) {
      throw new Error("Store ID and Category ID are required");
    }

    await this.invokeEdge("delete-store-category-with-products", {
      store_id: storeId,
      category_id: categoryId,
    });
  }

  static async deleteStoreCategoriesWithProducts(
    storeId: string,
    categoryIds: number[]
  ): Promise<void> {
    if (!storeId || !categoryIds?.length) return;

    await this.invokeEdge("delete-store-categories-with-products", {
      store_id: storeId,
      category_ids: categoryIds,
    });
  }

  static async ensureStoreCategory(
    storeId: string,
    categoryId: number,
    options?: {
      external_id?: string | null;
      custom_name?: string | null;
    }
  ): Promise<number | null> {
    if (!storeId || !Number.isFinite(categoryId)) {
      throw new Error("Valid Store ID and Category ID are required");
    }

    await this.ensureSession();

    const response = await this.invokeEdge<{ id?: number }>("ensure-store-category", {
      store_id: storeId,
      category_id: categoryId,
      external_id: options?.external_id ?? null,
      custom_name: options?.custom_name ?? null,
    });

    return response.id != null ? Number(response.id) : null;
  }

  static async getStoreCategoryExternalId(
    storeId: string,
    categoryId: number
  ): Promise<string | null> {
    if (!storeId || !Number.isFinite(categoryId)) {
      throw new Error("Valid Store ID and Category ID are required");
    }

    const response = await this.invokeEdge<{ external_id?: string | null }>(
      "get-store-category-external-id",
      { store_id: storeId, category_id: categoryId }
    );

    return response.external_id || null;
  }

  static async cleanupUnusedStoreCategory(
    storeId: string,
    categoryId: number
  ): Promise<void> {
    if (!storeId || !Number.isFinite(categoryId)) return;

    await this.invokeEdge("cleanup-unused-store-category", {
      store_id: storeId,
      category_id: categoryId,
    });
  }

  // ============================================================================
  // ВАЛЮТЫ МАГАЗИНА
  // ============================================================================

  static async getStoreCurrencies(
    storeId: string
  ): Promise<Array<{ code: string; rate: number; is_base: boolean }>> {
    const response = await this.invokeEdge<{
      rows: Array<{ code: string; rate?: number; is_base?: boolean }>;
    }>("store-currencies-list", { store_id: storeId });

    return (response.rows || []).map(row => ({
      code: row.code,
      rate: Number(row.rate) || 1,
      is_base: Boolean(row.is_base),
    }));
  }

  static async addStoreCurrency(
    storeId: string,
    code: string,
    rate: number
  ): Promise<void> {
    await this.invokeEdge("add-store-currency", { store_id: storeId, code, rate });
  }

  static async updateStoreCurrencyRate(
    storeId: string,
    code: string,
    rate: number
  ): Promise<void> {
    await this.invokeEdge("update-store-currency-rate", { store_id: storeId, code, rate });
  }

  static async setBaseStoreCurrency(storeId: string, code: string): Promise<void> {
    await this.invokeEdge("set-base-store-currency", { store_id: storeId, code });
  }

  static async deleteStoreCurrency(storeId: string, code: string): Promise<void> {
    await this.invokeEdge("delete-store-currency", { store_id: storeId, code });
  }

  static async getAvailableCurrencies(): Promise<
    Array<{ code: string; rate?: number }>
  > {
    const response = await this.invokeEdge<{
      rows: Array<{ code: string; rate?: number }>;
    }>("get-available-currencies", {});

    return (response.rows || []).map(row => ({
      code: row.code,
      rate: row.rate,
    }));
  }
}
