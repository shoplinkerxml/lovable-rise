import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SessionValidator } from "./session-validation";
import { CACHE_TTL, readCache, writeCache, removeCache } from "./cache-utils";

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
  categories: Array<{
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
  }>;
}

// Строго типизированные ответы API для лучшей проверки типов
interface EdgeResponse<T> {
  data?: T;
  error?: string;
}

interface ShopsListResponse {
  shops: ShopAggregated[];
}

interface ShopLimitResponse {
  value: number;
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
  private static readonly SHOPS_CACHE_KEY = "rq:shopsList";
  
  // Вместо статического поля используем WeakMap для изоляции состояния
  private static requestDeduplication = new Map<string, Promise<any>>();

  // ============================================================================
  // ПРИВАТНЫЕ УТИЛИТЫ
  // ============================================================================

  /**
   * Проверяет, находится ли приложение в offline режиме.
   * Безопасная проверка с обработкой возможных исключений.
   */
  private static isOffline(): boolean {
    if (typeof navigator === "undefined") return false;
    try {
      return !navigator.onLine;
    } catch (error) {
      console.warn("Unable to check online status:", error);
      return false;
    }
  }

  /**
   * Универсальный метод для обеспечения валидной сессии.
   * Выносим повторяющуюся логику в одно место.
   */
  private static async ensureSession(): Promise<void> {
    const validation = await SessionValidator.ensureValidSession();
    if (!validation.isValid) {
      throw new Error(`Session invalid: ${validation.error || "Session expired"}`);
    }
  }

  /**
   * Получение access token с проверкой сессии.
   * Объединяем два частых действия в один метод.
   */
  private static async getAccessToken(): Promise<string> {
    await this.ensureSession();
    
    const { data: authData, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(`Failed to get session: ${error.message}`);
    }
    
    const token = authData?.session?.access_token;
    if (!token) {
      throw new Error("No access token available");
    }
    
    return token;
  }

  /**
   * Улучшенная обработка ошибок Edge Functions.
   * Безопасный парсинг с логированием для отладки.
   */
  private static handleEdgeError(error: unknown, functionName: string): never {
    // Всегда логируем ошибки для отладки
    console.error(`Edge function "${functionName}" failed:`, error);

    // Пытаемся извлечь понятное сообщение
    let message = `${functionName} failed`;
    
    if (error && typeof error === "object") {
      const err = error as Record<string, any>;
      
      // Проверяем базовое сообщение
      if (err.message) {
        message = err.message;
      }
      
      // Пытаемся извлечь детали из контекста
      try {
        const context = err.context;
        if (context) {
          const body = context.body || context.error;
          if (body) {
            const parsed = typeof body === "string" ? JSON.parse(body) : body;
            const serverMessage = parsed?.message || parsed?.error;
            if (serverMessage) {
              message = `${functionName}: ${serverMessage}`;
            }
          }
        }
      } catch (parseError) {
        // Если парсинг не удался, используем базовое сообщение
        console.warn("Could not parse error details:", parseError);
      }
    }

    throw new Error(message);
  }

  /**
   * Универсальный метод вызова Edge Functions.
   * Инкапсулирует всю логику работы с API в одном месте.
   */
  private static async invokeEdge<T>(
    functionName: string,
    body: Record<string, unknown> = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error) {
      this.handleEdgeError(error, functionName);
    }

    if (!data) {
      throw new Error(`${functionName} returned no data`);
    }

    // Обрабатываем случай, когда data — строка (некоторые Edge Functions возвращают JSON-строку)
    return typeof data === "string" ? JSON.parse(data) : data;
  }

  /**
   * Дедупликация одновременных запросов к одному endpoint.
   * Предотвращает множественные идентичные запросы.
   */
  private static async deduplicateRequest<T>(
    key: string,
    request: () => Promise<T>
  ): Promise<T> {
    // Если запрос уже выполняется, возвращаем существующий Promise
    const existing = this.requestDeduplication.get(key);
    if (existing) {
      return existing;
    }

    // Создаем новый запрос
    const promise = request().finally(() => {
      // Очищаем после завершения (успешного или с ошибкой)
      this.requestDeduplication.delete(key);
    });

    this.requestDeduplication.set(key, promise);
    return promise;
  }

  /**
   * Чтение кэша магазинов с поддержкой legacy формата.
   * Миграция старого формата в новый происходит автоматически.
   */
  private static readShopsCache(allowStale: boolean): ShopAggregated[] | null {
    // Сначала пытаемся прочитать из нового кэша
    const cached = readCache<ShopAggregated[]>(this.SHOPS_CACHE_KEY, allowStale);
    if (cached?.data && Array.isArray(cached.data)) {
      return cached.data;
    }

    // Fallback на legacy localStorage (только в браузере)
    if (typeof window === "undefined") return null;

    try {
      const raw = window.localStorage.getItem(this.SHOPS_CACHE_KEY);
      if (!raw) return null;

      const legacy = JSON.parse(raw) as { items?: ShopAggregated[]; expiresAt?: number };
      
      if (Array.isArray(legacy.items) && typeof legacy.expiresAt === "number") {
        // Мигрируем в новый формат
        writeCache(this.SHOPS_CACHE_KEY, legacy.items, CACHE_TTL.shopsList);
        return legacy.items;
      }
    } catch (error) {
      console.warn("Failed to read legacy cache:", error);
    }

    return null;
  }

  /**
   * Запись в кэш с типобезопасностью
   */
  private static writeShopsCache(items: ShopAggregated[]): void {
    writeCache(this.SHOPS_CACHE_KEY, items, CACHE_TTL.shopsList);
  }

  /**
   * Обновление кэша с помощью функции-трансформера.
   * Применяет изменения атомарно к существующему кэшу.
   */
  private static updateShopsCache(
    mutator: (items: ShopAggregated[]) => ShopAggregated[]
  ): void {
    const current = this.readShopsCache(true);
    if (!current) return;

    try {
      const updated = mutator(current);
      this.writeShopsCache(updated);
    } catch (error) {
      console.error("Failed to update shops cache:", error);
    }
  }

  /**
   * Fallback для получения магазинов без агрегированных данных.
   * Используется когда основной endpoint недоступен.
   */
  private static async getShopsFallback(): Promise<ShopAggregated[]> {
    const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {});
    const shops = response.shops || [];
    
    return shops.map(shop => ({
      ...shop,
      marketplace: shop.marketplace || "Не вказано",
      productsCount: shop.productsCount || 0,
      categoriesCount: shop.categoriesCount || 0,
    }));
  }

  // ============================================================================
  // ПУБЛИЧНЫЕ МЕТОДЫ - УПРАВЛЕНИЕ МАГАЗИНАМИ
  // ============================================================================

  /**
   * Получение лимита магазинов для текущего пользователя.
   * Возвращает максимальное количество и возможность создания новых.
   */
  static async getShopLimit(): Promise<ShopLimitInfo> {
    await this.ensureSession();

    // Оптимизация: получаем оба значения параллельно
    const [max, current] = await Promise.all([
      this.getShopLimitOnly(),
      this.getShopsCount(),
    ]);

    return {
      current,
      max,
      canCreate: current < max,
    };
  }

  /**
   * Получение только максимального лимита магазинов.
   */
  static async getShopLimitOnly(): Promise<number> {
    await this.ensureSession();
    
    const response = await this.invokeEdge<ShopLimitResponse>(
      "get-shop-limit-only",
      {}
    );
    
    return Number(response.value) || 0;
  }

  /**
   * Получение количества магазинов текущего пользователя.
   */
  static async getShopsCount(): Promise<number> {
    if (this.isOffline()) return 0;

    await this.ensureSession();
    
    const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {});
    return Array.isArray(response.shops) ? response.shops.length : 0;
  }

  /**
   * Получение списка магазинов текущего пользователя (базовая информация).
   */
  static async getShops(): Promise<Shop[]> {
    if (this.isOffline()) return [];

    await this.ensureSession();
    
    const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {});
    return response.shops || [];
  }

  /**
   * Получение агрегированных данных магазинов с кэшированием и дедупликацией.
   * Это основной метод для получения списка магазинов в UI.
   */
  static async getShopsAggregated(): Promise<ShopAggregated[]> {
    // Проверяем валидный кэш
    const cached = this.readShopsCache(false);
    if (cached) {
      const hasSuspiciousCounts = cached.some(
        (s) => (s.productsCount ?? 0) > 0 && (s.categoriesCount ?? 0) === 0
      );
      if (!hasSuspiciousCounts) {
        return cached;
      }
    }

    // В offline режиме используем устаревший кэш
    if (this.isOffline()) {
      const stale = this.readShopsCache(true);
      return stale || [];
    }

    await this.ensureSession();

    // Дедуплицируем запросы
    return this.deduplicateRequest("shops-aggregated", async () => {
      try {
        const response = await this.invokeEdge<ShopsListResponse>(
          "user-shops-list",
          {}
        );
        
        const shops = response.shops || [];
        this.writeShopsCache(shops);
        return shops;
      } catch (error) {
        console.error("Failed to fetch aggregated shops, using fallback:", error);
        
        // Пытаемся использовать устаревший кэш
        const stale = this.readShopsCache(true);
        if (stale) return stale;
        
        // Последний вариант — fallback запрос
        const fallback = await this.getShopsFallback();
        this.writeShopsCache(fallback);
        return fallback;
      }
    });
  }

  /**
   * Получение одного магазина по ID с полной конфигурацией.
   */
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

  /**
   * Агрегированные данные настроек магазина одной функцией.
   */
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
      storeCurrencies: Array.isArray(response.storeCurrencies)
        ? response.storeCurrencies.map((r) => ({
            code: String(r.code),
            rate: Number(r.rate ?? 1),
            is_base: Boolean(r.is_base),
          }))
        : [],
      availableCurrencies: Array.isArray(response.availableCurrencies)
        ? response.availableCurrencies.map((r) => ({
            code: String(r.code),
            rate: r.rate != null ? Number(r.rate) : undefined,
          }))
        : [],
      marketplaces: Array.isArray(response.marketplaces)
        ? response.marketplaces.map((m) => String(m))
        : [],
      categories: Array.isArray(response.categories)
        ? response.categories.map((row) => ({
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
          }))
        : [],
    };
  }

  /**
   * Создание нового магазина с валидацией лимитов.
   */
  static async createShop(shopData: CreateShopData): Promise<Shop> {
    const storeName = shopData.store_name?.trim();
    if (!storeName) {
      throw new Error("Назва магазину обов'язкова");
    }

    await this.ensureSession();

    // Проверяем лимит перед созданием
    const limitInfo = await this.getShopLimit();
    if (!limitInfo.canCreate) {
      throw new Error(
        `Досягнуто ліміту магазинів (${limitInfo.max}). Оновіть тарифний план.`
      );
    }

    const response = await this.invokeEdge<ShopResponse>("create-shop", {
      store_name: storeName,
      template_id: shopData.template_id ?? null,
      xml_config: shopData.xml_config ?? null,
      custom_mapping: shopData.custom_mapping ?? null,
      store_company: shopData.store_company ?? null,
      store_url: shopData.store_url ?? null,
    });

    // Инвалидируем кэш после создания
    removeCache(this.SHOPS_CACHE_KEY);

    return response.shop;
  }

  /**
   * Обновление магазина с валидацией и очисткой кэша.
   */
  static async updateShop(id: string, shopData: UpdateShopData): Promise<Shop> {
    if (!id) throw new Error("Shop ID is required");

    await this.ensureSession();

    // Подготавливаем данные для обновления
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

    if (shopData.is_active !== undefined) {
      patch.is_active = shopData.is_active;
    }

    if (Object.keys(patch).length === 0) {
      throw new Error("No fields to update");
    }

    patch.updated_at = new Date().toISOString();

    const response = await this.invokeEdge<ShopResponse>("update-shop", {
      id,
      patch,
    });

    // Инвалидируем кэш после обновления
    removeCache(this.SHOPS_CACHE_KEY);

    return response.shop;
  }

  /**
   * Удаление магазина с очисткой кэша.
   */
  static async deleteShop(id: string): Promise<void> {
    if (!id) throw new Error("Shop ID is required");

    await this.ensureSession();

    await this.invokeEdge<{ ok: boolean }>("delete-shop", { id });

    // Инвалидируем кэш после удаления
    removeCache(this.SHOPS_CACHE_KEY);
  }

  // ============================================================================
  // ПУБЛИЧНЫЕ МЕТОДЫ - ОПТИМИСТИЧНЫЕ ОБНОВЛЕНИЯ КЭША
  // ============================================================================

  /**
   * Увеличение счетчика товаров в кэше (оптимистичное обновление).
   */
  static bumpProductsCountInCache(storeId: string, delta: number): void {
    this.updateShopsCache(shops =>
      shops.map(shop =>
        shop.id === storeId
          ? {
              ...shop,
              productsCount: Math.max(0, (shop.productsCount || 0) + delta),
            }
          : shop
      )
    );
  }

  /**
   * Увеличение счетчика категорий в кэше (оптимистичное обновление).
   */
  static bumpCategoriesCountInCache(storeId: string, delta: number): void {
    this.updateShopsCache(shops =>
      shops.map(shop =>
        shop.id === storeId
          ? {
              ...shop,
              categoriesCount: Math.max(0, (shop.categoriesCount || 0) + delta),
            }
          : shop
      )
    );
  }

  /**
   * Установка точного количества категорий в кэше.
   * Сбрасывает счетчик в 0, если в магазине нет товаров.
   */
  static setCategoriesCountInCache(storeId: string, count: number): void {
    this.updateShopsCache(shops =>
      shops.map(shop => {
        if (shop.id !== storeId) return shop;

        const productsCount = shop.productsCount || 0;
        // Если нет товаров, категорий тоже не должно быть
        const finalCount = productsCount === 0 ? 0 : Math.max(0, count);

        return {
          ...shop,
          categoriesCount: finalCount,
        };
      })
    );
  }

  // ============================================================================
  // ПУБЛИЧНЫЕ МЕТОДЫ - КАТЕГОРИИ МАГАЗИНА
  // ============================================================================

  /**
   * Получение категорий магазина с объединенными данными.
   */
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

    await this.ensureSession();

    const response = await this.invokeEdge<{ rows: CategoryRow[] }>(
      "store-categories-list",
      { store_id: storeId }
    );

    const rows = response.rows || [];

    return rows.map(row => {
      const baseCategory = row.store_categories || {};

      return {
        store_category_id: row.id,
        store_id: row.store_id,
        category_id: row.category_id,
        name: row.custom_name || baseCategory.name || "",
        base_external_id: baseCategory.external_id || null,
        parent_external_id: baseCategory.parent_external_id || null,
        base_rz_id: baseCategory.rz_id || null,
        store_external_id: row.external_id || null,
        store_rz_id_value: row.rz_id_value || null,
        is_active: row.is_active,
      };
    });
  }

  /**
   * Обновление полей категории магазина.
   */
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

    await this.invokeEdge("update-store-category", {
      id: payload.id,
      patch,
    });
  }

  /**
   * Удаление категории магазина со всеми товарами.
   */
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

  /**
   * Массовое удаление категорий со всеми товарами.
   */
  static async deleteStoreCategoriesWithProducts(
    storeId: string,
    categoryIds: number[]
  ): Promise<void> {
    if (!storeId || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return;
    }

    await this.invokeEdge("delete-store-categories-with-products", {
      store_id: storeId,
      category_ids: categoryIds,
    });
  }

  /**
   * Привязка категории к магазину (upsert).
   * Возвращает ID записи store_categories.
   */
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

    const response = await this.invokeEdge<{ id?: number }>(
      "ensure-store-category",
      {
        store_id: storeId,
        category_id: categoryId,
        external_id: options?.external_id ?? null,
        custom_name: options?.custom_name ?? null,
      }
    );

    return response.id != null ? Number(response.id) : null;
  }

  /**
   * Получение внешнего ID категории магазина.
   */
  static async getStoreCategoryExternalId(
    storeId: string,
    categoryId: number
  ): Promise<string | null> {
    if (!storeId || !Number.isFinite(categoryId)) {
      throw new Error("Valid Store ID and Category ID are required");
    }

    const response = await this.invokeEdge<{ external_id?: string | null }>(
      "get-store-category-external-id",
      {
        store_id: storeId,
        category_id: categoryId,
      }
    );

    return response.external_id || null;
  }

  /**
   * Очистка неиспользуемой категории магазина.
   */
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
  // ПУБЛИЧНЫЕ МЕТОДЫ - ВАЛЮТЫ МАГАЗИНА
  // ============================================================================

  /**
   * Получение списка валют магазина.
   */
  static async getStoreCurrencies(
    storeId: string
  ): Promise<Array<{ code: string; rate: number; is_base: boolean }>> {
    const response = await this.invokeEdge<{
      rows: Array<{ code: string; rate?: number; is_base?: boolean }>;
    }>("store-currencies-list", { store_id: storeId });

    const rows = response.rows || [];

    return rows.map(row => ({
      code: row.code,
      rate: Number(row.rate) || 1,
      is_base: Boolean(row.is_base),
    }));
  }

  /**
   * Добавление валюты в магазин.
   */
  static async addStoreCurrency(
    storeId: string,
    code: string,
    rate: number
  ): Promise<void> {
    await this.invokeEdge("add-store-currency", {
      store_id: storeId,
      code,
      rate,
    });
  }

  /**
   * Обновление курса валюты.
   */
  static async updateStoreCurrencyRate(
    storeId: string,
    code: string,
    rate: number
  ): Promise<void> {
    await this.invokeEdge("update-store-currency-rate", {
      store_id: storeId,
      code,
      rate,
    });
  }

  /**
   * Установка базовой валюты магазина.
   */
  static async setBaseStoreCurrency(storeId: string, code: string): Promise<void> {
    await this.invokeEdge("set-base-store-currency", {
      store_id: storeId,
      code,
    });
  }

  /**
   * Удаление валюты из магазина.
   */
  static async deleteStoreCurrency(storeId: string, code: string): Promise<void> {
    await this.invokeEdge("delete-store-currency", {
      store_id: storeId,
      code,
    });
  }

  /**
   * Получение списка доступных валют.
   */
  static async getAvailableCurrencies(): Promise<
    Array<{ code: string; rate?: number }>
  > {
    const response = await this.invokeEdge<{
      rows: Array<{ code: string; rate?: number }>;
    }>("get-available-currencies", {});

    const rows = response.rows || [];

    return rows.map(row => ({
      code: row.code,
      rate: row.rate,
    }));
  }

  // ============================================================================
  // ПУБЛИЧНЫЕ МЕТОДЫ - ПРОЧЕЕ
  // ============================================================================

  /**
   * Получение количества товаров в магазине.
   */
  static async getStoreProductsCount(storeId: string): Promise<number> {
    const response = await this.invokeEdge<{ count?: number }>(
      "get-store-products-count",
      { store_id: storeId }
    );

    return Number(response.count) || 0;
  }
}
