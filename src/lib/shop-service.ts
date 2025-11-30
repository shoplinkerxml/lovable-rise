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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("tariff_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1);

    if (subscriptionError || !subscriptions?.[0]) {
      return 0;
    }

    const subscription = subscriptions[0];

    const { data: limitData, error: limitError } = await supabase
      .from("tariff_limits")
      .select("value")
      .eq("tariff_id", subscription.tariff_id)
      .ilike("limit_name", "%магазин%")
      .eq("is_active", true)
      .maybeSingle();

    if (limitError) {
      console.error("Error fetching tariff limit:", limitError);
      return 0;
    }

    return limitData?.value || 0;
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { count, error } = await supabase
      .from("user_stores")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (error) {
      return 0;
    }

    return count || 0;
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

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("user_stores")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("store_name", { ascending: true });

      if (error) {
        return [];
      }

      return (data || []) as Shop[];
    } catch {
      return [];
    }
  }

  static async getShopsAggregated(): Promise<ShopAggregated[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // Быстрый путь: не на страницах магазинов/товаров — пробуем взять кэш, не дергаем сеть
    try {
      if (typeof window !== "undefined") {
        const p = window.location.pathname.toLowerCase();
        const allowed = p.includes("/user/shops") || p.includes("/user/products");
        if (!allowed) {
          const cached = ShopService.readShopsCache(true);
          if (cached?.items && Array.isArray(cached.items)) {
            return cached.items;
          }
          return [];
        }
      }
    } catch {
      /* ignore */
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
    const templateIds = Array.from(
      new Set(baseShops.map((s) => s.template_id).filter((v) => !!v)),
    ) as string[];

    const [templates] = await Promise.all([
      templateIds.length
        ? supabase
            .from("store_templates")
            .select("id,marketplace")
            .in("id", templateIds)
            .then((r) => r.data || [])
        : Promise.resolve([]),
    ]);

    const templatesMap: Record<string, string> = {};
    for (const r of templates as Array<{ id: string; marketplace?: string }>) {
      if (r?.id) templatesMap[String(r.id)] = r?.marketplace || "Не вказано";
    }

    return baseShops.map((s) => ({
      ...s,
      marketplace: s.template_id
        ? templatesMap[String(s.template_id)] || "Не вказано"
        : "Не вказано",
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

    const { data, error } = await supabase
      .from("user_stores")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        store_name: shopData.store_name.trim(),
        template_id: shopData.template_id || null,
        xml_config: shopData.xml_config || null,
        custom_mapping: shopData.custom_mapping || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Create shop error:", error);
      throw new Error(error.message);
    }

    removeCache(ShopService.SHOPS_CACHE_KEY);
    return data as Shop;
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

    const { data, error } = await supabase
      .from("user_stores")
      .update(cleanData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update shop error:", error);
      throw new Error(error.message);
    }

    removeCache(ShopService.SHOPS_CACHE_KEY);
    return data as Shop;
  }

  /** Удаление магазина */
  static async deleteShop(id: string): Promise<void> {
    if (!id) throw new Error("Shop ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { error } = await supabase.from("user_stores").delete().eq("id", id);

    if (error) {
      console.error("Delete shop error:", error);
      throw new Error(error.message);
    }
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

    try {
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
    } catch {
      const { data, error } = await supabase
        .from("store_store_categories")
        .select(
          "id,store_id,category_id,custom_name,is_active,external_id,rz_id_value, store_categories:category_id(id,external_id,name,parent_external_id,rz_id)",
        )
        .eq("store_id", storeId)
        .order("id", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data || []) as Array<Record<string, unknown>>;
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

    try {
      await ShopService.invokeEdge<unknown>("update-store-category", { id: payload.id, patch: clean });
    } catch {
      const { error } = await supabase
        .from("store_store_categories")
        .update(clean)
        .eq("id", payload.id);
      if (error) throw new Error(error.message);
    }
  }

  /** Удаление категории магазина и всех её товаров в магазине */
  static async deleteStoreCategoryWithProducts(
    storeId: string,
    categoryId: number,
  ): Promise<void> {
    if (!storeId || !categoryId) throw new Error("storeId and categoryId required");
    try {
      await ShopService.invokeEdge<unknown>("delete-store-category-with-products", { store_id: storeId, category_id: categoryId });
    } catch {
      const { error: prodErr } = await supabase
        .from("store_products")
        .delete()
        .eq("store_id", storeId)
        .eq("category_id", categoryId);
      if (prodErr) throw new Error(prodErr.message);
      const { error: catErr } = await supabase
        .from("store_store_categories")
        .delete()
        .eq("store_id", storeId)
        .eq("category_id", categoryId);
      if (catErr) throw new Error(catErr.message);
    }
  }

  /** Массовое удаление категорий магазина и их товаров */
  static async deleteStoreCategoriesWithProducts(
    storeId: string,
    categoryIds: number[],
  ): Promise<void> {
    if (!storeId || !Array.isArray(categoryIds) || categoryIds.length === 0) return;
    const ids = categoryIds;
    try {
      await ShopService.invokeEdge<unknown>("delete-store-categories-with-products", { store_id: storeId, category_ids: ids });
    } catch {
      const { error: prodErr } = await supabase
        .from("store_products")
        .delete()
        .eq("store_id", storeId)
        .in("category_id", ids);
      if (prodErr) throw new Error(prodErr.message);
      const { error: catErr } = await supabase
        .from("store_store_categories")
        .delete()
        .eq("store_id", storeId)
        .in("category_id", ids);
      if (catErr) throw new Error(catErr.message);
    }
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: storeOwner, error: storeOwnerErr } = await supabase
      .from("user_stores")
      .select("id,user_id")
      .eq("id", storeId)
      .maybeSingle();
    if (storeOwnerErr) throw new Error(storeOwnerErr.message);
    if (!storeOwner) throw new Error("Store not found");
    if (String(storeOwner.user_id) !== String(user.id)) throw new Error("store_not_owned_by_user");

    try {
      const resp = await ShopService.invokeEdge<{ id?: number | string }>("ensure-store-category", {
        store_id: storeId,
        category_id: Number(categoryId),
        external_id: options?.external_id ?? null,
        custom_name: options?.custom_name ?? null,
      });
      return resp?.id != null ? Number(resp.id) : null;
    } catch {
      const { data: existing, error: selErr } = await supabase
        .from("store_store_categories")
        .select("id,is_active,external_id")
        .eq("store_id", storeId)
        .eq("category_id", categoryId)
        .maybeSingle();
      if (selErr) throw new Error(selErr.message);
      if (existing?.id) {
        const patch: Record<string, unknown> = { is_active: true };
        if (options?.external_id !== undefined) patch.external_id = options.external_id;
        if (options?.custom_name !== undefined) patch.custom_name = options.custom_name;
        const { error: updErr } = await supabase
          .from("store_store_categories")
          .update(patch)
          .eq("id", existing.id);
        if (updErr) throw new Error(updErr.message);
        return Number(existing.id);
      }
      const payload = {
        store_id: storeId,
        category_id: Number(categoryId),
        is_active: true,
        external_id: options?.external_id ?? null,
        custom_name: options?.custom_name ?? null,
      };
      const { data: inserted, error: insErr } = await supabase
        .from("store_store_categories")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      return inserted?.id ? Number(inserted.id) : null;
    }
  }

  /** Получить внешний ID категории магазина для пары (store_id, category_id) */
  static async getStoreCategoryExternalId(
    storeId: string,
    categoryId: number,
  ): Promise<string | null> {
    if (!storeId || !Number.isFinite(categoryId)) throw new Error("storeId and categoryId required");
    try {
      const resp = await ShopService.invokeEdge<{ external_id?: string | null }>("get-store-category-external-id", {
        store_id: storeId,
        category_id: categoryId,
      });
      return resp?.external_id ?? null;
    } catch {
      const { data, error } = await supabase
        .from("store_store_categories")
        .select("external_id")
        .eq("store_id", storeId)
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? ((data as { external_id?: string | null }).external_id ?? null) : null;
    }
  }

  static async cleanupUnusedStoreCategory(storeId: string, categoryId: number): Promise<void> {
    if (!storeId || !Number.isFinite(categoryId)) return;
    const { data: prod, error: prodErr } = await supabase
      .from("store_products")
      .select("id")
      .eq("store_id", storeId)
      .eq("category_id", categoryId)
      .limit(1);
    if (prodErr) return;
    const used = Array.isArray(prod) && prod.length > 0;
    if (used) return;
    try {
      await ShopService.invokeEdge<unknown>("cleanup-unused-store-category", { store_id: storeId, category_id: categoryId });
    } catch {
      await supabase
        .from("store_store_categories")
        .delete()
        .eq("store_id", storeId)
        .eq("category_id", categoryId);
    }
  }

  /** Валюты магазина */
  static async getStoreCurrencies(storeId: string): Promise<Array<{ code: string; rate: number; is_base: boolean }>> {
    try {
      const resp = await ShopService.invokeEdge<{ rows?: Array<{ code: string; rate?: number; is_base?: boolean }> }>(
        "store-currencies-list",
        { store_id: storeId },
      );
      const rows = (resp?.rows || []) as Array<{ code: string; rate?: number; is_base?: boolean }>;
      return rows.map((r) => ({ code: String(r.code), rate: Number(r.rate ?? 1), is_base: !!r.is_base }));
    } catch {
      const { data, error } = await supabase
        .from("store_currencies")
        .select("code,rate,is_base")
        .eq("store_id", storeId);
      if (error) throw new Error(error.message);
      const rows = (data || []) as Array<{ code: string; rate?: number; is_base?: boolean }>;
      return rows.map((r) => ({ code: String(r.code), rate: Number(r.rate ?? 1), is_base: !!r.is_base }));
    }
  }

  static async addStoreCurrency(storeId: string, code: string, rate: number): Promise<void> {
    try {
      await ShopService.invokeEdge<unknown>("add-store-currency", { store_id: storeId, code, rate });
    } catch {
      const { error } = await supabase
        .from("store_currencies")
        .insert({ store_id: storeId, code, rate, is_base: false });
      if (error) throw new Error(error.message);
    }
  }

  static async updateStoreCurrencyRate(storeId: string, code: string, rate: number): Promise<void> {
    try {
      await ShopService.invokeEdge<unknown>("update-store-currency-rate", { store_id: storeId, code, rate });
    } catch {
      const { error } = await supabase
        .from("store_currencies")
        .update({ rate })
        .eq("store_id", storeId)
        .eq("code", code);
      if (error) throw new Error(error.message);
    }
  }

  static async setBaseStoreCurrency(storeId: string, code: string): Promise<void> {
    try {
      await ShopService.invokeEdge<unknown>("set-base-store-currency", { store_id: storeId, code });
    } catch {
      const { error: e1 } = await supabase
        .from("store_currencies")
        .update({ is_base: false })
        .eq("store_id", storeId);
      if (e1) throw new Error(e1.message);
      const { error: e2 } = await supabase
        .from("store_currencies")
        .update({ is_base: true })
        .eq("store_id", storeId)
        .eq("code", code);
      if (e2) throw new Error(e2.message);
    }
  }

  static async deleteStoreCurrency(storeId: string, code: string): Promise<void> {
    try {
      await ShopService.invokeEdge<unknown>("delete-store-currency", { store_id: storeId, code });
    } catch {
      const { error } = await supabase
        .from("store_currencies")
        .delete()
        .eq("store_id", storeId)
        .eq("code", code);
      if (error) throw new Error(error.message);
    }
  }

  static async getAvailableCurrencies(): Promise<Array<{ code: string; rate?: number }>> {
    const { data, error } = await supabase.from("currencies").select("code,rate");
    if (error) throw new Error(error.message);
    const rows = (data || []) as Array<{ code: unknown; rate?: unknown }>;
    return rows.map((c) => ({ code: String(c.code as string), rate: typeof c.rate === "number" ? (c.rate as number) : undefined }));
  }

  static async getStoreProductsCount(storeId: string): Promise<number> {
    const { count } = await supabase
      .from("store_products")
      .select("*", { count: "exact", head: true })
      .eq("store_id", storeId);
    return count || 0;
  }
}
