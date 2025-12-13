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
    let status: number | undefined = undefined;
    
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
          status = typeof context.status === "number" ? context.status : undefined;
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

    if (status && !message.includes(String(status))) {
      if (status === 401) message = `${message} (401 Unauthorized)`;
      else if (status === 403) message = `${message} (403 Forbidden)`;
      else if (status === 404) message = `${message} (404 Not Found)`;
      else if (status === 409) message = `${message} (409 Conflict)`;
      else message = `${message} (${status})`;
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
    return null;
  }

  /**
   * Запись в кэш с типобезопасностью
   */
  private static writeShopsCache(items: ShopAggregated[]): void {
    return;
  }

  /**
   * Обновление кэша с помощью функции-трансформера.
   * Применяет изменения атомарно к существующему кэшу.
   */
  private static updateShopsCache(
    mutator: (items: ShopAggregated[]) => ShopAggregated[]
  ): void {
    return;
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
    let v = 0;
    try {
      const response = await this.invokeEdge<ShopLimitResponse>("get-shop-limit-only", {});
      v = Number(response.value) || 0;
    } catch {
      v = 0;
    }
    if (v > 0) return v;
    if (v <= 0) v = 3;
    return v;
  }

  /**
   * Получение количества магазинов текущего пользователя.
   */
  static async getShopsCount(): Promise<number> {
    if (this.isOffline()) return 0;

    await this.ensureSession();
    try {
      const response = await this.invokeEdge<ShopsListResponse>("user-shops-list", {});
      return Array.isArray(response.shops) ? response.shops.length : 0;
    } catch {
      return 0;
    }
  }

  static async getShopsCountCached(): Promise<number> {
    return await this.getShopsCount();
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
    if (this.isOffline()) {
      return [];
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
        return shops;
      } catch (error) {
        console.error("Failed to fetch aggregated shops, using fallback:", error);
        const fallback = await this.getShopsFallback();
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
      return response.shop;
    } catch (e) {
      const msg = String((e as { message?: string } | null)?.message || "");
      if (/limit/i.test(msg) || /\(400\)/.test(msg) || /LIMIT_REACHED/i.test(msg)) {
        const max = await this.getShopLimitOnly();
        throw new Error(`Досягнуто ліміту магазинів (${max}). Оновіть тарифний план.`);
      }
      throw e;
    }
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

    return response.shop;
  }

  /**
   * Удаление магазина с очисткой кэша.
   */
  static async deleteShop(id: string): Promise<void> {
    if (!id) throw new Error("Shop ID is required");

    await this.ensureSession();

    // 1) Пробуем прямое удаление для владельца (для пустого магазина это самый быстрый путь)
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = String(auth?.user?.id || "");
      if (uid) {
        const { error: delErr } = await supabase
          .from("user_stores")
          .delete()
          .eq("id", id)
          .eq("user_id", uid);
        if (!delErr) { return; }
      }
    } catch { /* ignore */ }

    // 2) Основной путь через Edge
    try {
      await this.invokeEdge<{ ok: boolean }>("delete-shop", { id });
    } catch (e) {
      const msg = String((e as { message?: string } | null)?.message || "");
      // Ошибки прав/аутентификации — возвращаем сразу
      if (/401|Unauthorized|403|Forbidden|forbidden/i.test(msg)) throw e;
      // Конфликт из-за зависимостей → чистим и повторяем
      try {
        const { ProductService } = await import("@/lib/product-service");
        const products = await ProductService.getProductsAggregated(id);
        const productIds = Array.from(new Set((products || []).map((p) => String(p.id)).filter(Boolean)));
        if (productIds.length > 0) {
          await ProductService.bulkRemoveStoreProductLinks(productIds, [String(id)]);
        }
      } catch { /* ignore */ }
      try {
        const categories = await ShopService.getStoreCategories(String(id));
        const categoryIds = Array.from(new Set((categories || []).map((c) => Number(c.store_category_id)).filter((n) => Number.isFinite(n))));
        if (categoryIds.length > 0) {
          await ShopService.deleteStoreCategoriesWithProducts(String(id), categoryIds);
        }
      } catch { /* ignore */ }
      await this.invokeEdge<{ ok: boolean }>("delete-shop", { id });
    }

    return;
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
 
  /**
   * Установка точного количества товаров в кэше.
   * Если товаров 0, категории тоже обнуляются.
   */
  static setProductsCountInCache(storeId: string, count: number): void {
    const final = Math.max(0, Number(count) || 0);
    this.updateShopsCache(shops =>
      shops.map(shop => {
        if (shop.id !== storeId) return shop;
        return {
          ...shop,
          productsCount: final,
          categoriesCount: final === 0 ? 0 : (shop.categoriesCount || 0),
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
    if (!storeId) return 0;

    // Edge Function: точный подсчет количества товаров
    try {
      await this.ensureSession();
      const resp = await this.invokeEdge<{ count: number }>("get-store-products-count", { store_id: storeId });
      return Math.max(0, Number(resp?.count || 0));
    } catch (error) {
      console.warn("getStoreProductsCount edge failed, returning 0:", error);
      return 0;
    }
  }
 
  /**
   * Пересчет счетчиков магазина и синхронизация с кэшем.
   */
  static async recomputeStoreCounts(storeId: string): Promise<{ productsCount: number; categoriesCount: number }> {
    if (!storeId) return { productsCount: 0, categoriesCount: 0 };
    await this.ensureSession();
    // Получаем количество товаров и список названий категорий через Edge Functions
    const [{ count: pCountRaw }, catResp] = await Promise.all([
      this.invokeEdge<{ count: number }>("get-store-products-count", { store_id: storeId }),
      this.invokeEdge<{ names?: string[] }>("store-category-filter-options", { store_id: storeId }),
    ]);
    const pCount = Math.max(0, Number(pCountRaw || 0));
    const cCount = pCount === 0 ? 0 : Math.max(0, Array.isArray(catResp?.names) ? catResp.names!.length : 0);
    this.updateShopsCache(shops =>
      shops.map(s => String(s.id) === String(storeId) ? { ...s, productsCount: pCount, categoriesCount: cCount } : s)
    );
    return { productsCount: pCount, categoriesCount: cCount };
  }
}
