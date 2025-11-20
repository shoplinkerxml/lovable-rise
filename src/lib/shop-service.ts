import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";

export interface Shop {
  id: string; // UUID
  user_id: string;
  store_name: string;
  store_company?: string | null;
  store_url?: string | null;
  template_id?: string | null;
  xml_config?: any;
  custom_mapping?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShopData {
  store_name: string;
  store_company?: string | null;
  store_url?: string | null;
  template_id?: string | null;
  xml_config?: any;
  custom_mapping?: any;
}

export interface UpdateShopData {
  store_name?: string;
  store_company?: string | null;
  store_url?: string | null;
  template_id?: string | null;
  xml_config?: any;
  custom_mapping?: any;
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
  /** Получение только максимального лимита магазинов (без подсчета текущих) */
  static async getShopLimitOnly(): Promise<number> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user's current active subscription
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('tariff_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1);

    if (subscriptionError || !subscriptions?.[0]) {
      return 0;
    }

    const subscription = subscriptions[0];

    // Get the shop limit directly from tariff_limits by limit_name
    const { data: limitData, error: limitError } = await supabase
      .from('tariff_limits')
      .select('value')
      .eq('tariff_id', subscription.tariff_id)
      .ilike('limit_name', '%магазин%')
      .eq('is_active', true)
      .maybeSingle();

    if (limitError) {
      console.error('Error fetching tariff limit:', limitError);
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
      canCreate: currentCount < maxShops
    };
  }

  /** Получение количества магазинов текущего пользователя */
  static async getShopsCount(): Promise<number> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // @ts-ignore - table not in generated types yet
    const { count, error } = await (supabase as any)
      .from('user_stores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Get shops count error:', error);
      return 0;
    }

    return count || 0;
  }

  /** Получение списка магазинов текущего пользователя */
  static async getShops(): Promise<Shop[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    try {
      // @ts-ignore - table not in generated types yet
      const { data, error } = await (supabase as any)
        .from('user_stores')
        .select('*')
        .eq('is_active', true)
        .order('store_name', { ascending: true });

      if (error) {
        console.error('Get shops error:', error);
        // Return empty array instead of throwing error for empty table
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get shops error:', error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  static async getShopsAggregated(): Promise<ShopAggregated[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: authData } = await (supabase as any).auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    try {
      const { data, error } = await (supabase as any).functions.invoke('user-shops-list', {
        body: {},
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (error) throw error;
      const rows = (data as unknown as { shops?: ShopAggregated[] })?.shops || [];
      return rows as ShopAggregated[];
    } catch (_) {
      // Фолбэк: агрегируем на клиенте параллельно
      const baseShops: Shop[] = await this.getShops();
      const storeIds = baseShops.map((s) => s.id);
      const templateIds = Array.from(new Set(baseShops.map((s) => s.template_id).filter((v) => !!v))) as string[];
            const [templates, linkRows] = await Promise.all([
              templateIds.length
                ? (supabase as any)
                    .from('store_templates')
                    .select('id,marketplace')
                    .in('id', templateIds)
                    .then((r: any) => r.data || [])
                : Promise.resolve([]),
              storeIds.length
                ? (supabase as any)
                    .from('store_product_links')
                    .select('store_id,is_active,custom_category_id,store_products(category_id,category_external_id)')
                    .in('store_id', storeIds)
                    .then((r: any) => r.data || [])
                : Promise.resolve([]),
            ]);
            const templatesMap: Record<string, string> = {};
            for (const r of templates as Array<{ id: string; marketplace?: string }>) {
              if (r?.id) templatesMap[String(r.id)] = r?.marketplace || 'Не вказано';
            }
            const productsCountMap: Record<string, number> = {};
            const categoriesMap: Record<string, Set<string>> = {};
            for (const r of linkRows as Array<any>) {
              const sid = String(r.store_id);
              const active = r?.is_active !== false;
              if (active) productsCountMap[sid] = (productsCountMap[sid] || 0) + 1;
              const linkCat = r?.custom_category_id != null ? String(r.custom_category_id) : null;
              const baseCatId = r?.store_products?.category_id != null ? String(r.store_products.category_id) : r?.store_products?.category_external_id ? String(r.store_products.category_external_id) : null;
              const catId = linkCat || baseCatId;
              if (catId) {
                if (!categoriesMap[sid]) categoriesMap[sid] = new Set();
                categoriesMap[sid].add(catId);
              }
            }
      return baseShops.map((s) => ({
        ...s,
        marketplace: s.template_id ? templatesMap[String(s.template_id)] || 'Не вказано' : 'Не вказано',
        productsCount: productsCountMap[s.id] || 0,
        categoriesCount: (categoriesMap[s.id]?.size) || 0,
      }));
    }
  }

  /** Получение одного магазина по ID */
  static async getShop(id: string): Promise<Shop> {
    if (!id) throw new Error("Shop ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('user_stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get shop error:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Shop not found");
    }

    return data;
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user can create more shops
    const limitInfo = await this.getShopLimit();
    if (!limitInfo.canCreate) {
      throw new Error(`Досягнуто ліміту магазинів (${limitInfo.max}). Оновіть тарифний план.`);
    }

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('user_stores')
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        store_name: shopData.store_name.trim(),
        template_id: shopData.template_id || null,
        xml_config: shopData.xml_config || null,
        custom_mapping: shopData.custom_mapping || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Create shop error:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /** Обновление магазина */
  static async updateShop(id: string, shopData: UpdateShopData): Promise<Shop> {
    if (!id) throw new Error("Shop ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const cleanData: any = {};
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

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('user_stores')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update shop error:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /** Удаление магазина */
  static async deleteShop(id: string): Promise<void> {
    if (!id) throw new Error("Shop ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // @ts-ignore - table not in generated types yet
    const { error } = await (supabase as any)
      .from('user_stores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete shop error:', error);
      throw new Error(error.message);
    }
  }

  /** Категории магазина: объединённые данные ssc + sc */
  static async getStoreCategories(storeId: string): Promise<Array<{
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
  }>> {
    if (!storeId) throw new Error("Store ID is required");
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) throw new Error("Invalid session");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data: storeOwner, error: storeOwnerErr } = await (supabase as any)
      .from('user_stores')
      .select('id,user_id')
      .eq('id', storeId)
      .maybeSingle();
    if (storeOwnerErr) throw new Error(storeOwnerErr.message);
    if (!storeOwner) throw new Error("Store not found");
    if (String(storeOwner.user_id) !== String(user.id)) {
      throw new Error("store_not_owned_by_user");
    }

    const { data, error } = await (supabase as any)
      .from('store_store_categories')
      .select('id,store_id,category_id,custom_name,is_active,external_id,rz_id_value, store_categories:category_id(id,external_id,name,parent_external_id,rz_id)')
      .eq('store_id', storeId)
      .order('id', { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data || []) as Array<any>;
    return rows.map((r) => {
      const sc = r.store_categories || {};
      return {
        store_category_id: Number(r.id),
        store_id: String(r.store_id),
        category_id: Number(r.category_id),
        name: String(r.custom_name ?? sc.name ?? ''),
        base_external_id: sc.external_id ?? null,
        parent_external_id: sc.parent_external_id ?? null,
        base_rz_id: sc.rz_id ?? null,
        store_external_id: r.external_id ?? null,
        store_rz_id_value: r.rz_id_value ?? null,
        is_active: !!r.is_active,
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
    if (!payload?.id) throw new Error('Category row id is required');
    const clean: any = {};
    if (payload.rz_id_value !== undefined) clean.rz_id_value = payload.rz_id_value;
    if (payload.is_active !== undefined) clean.is_active = !!payload.is_active;
    if (payload.custom_name !== undefined) clean.custom_name = payload.custom_name ?? null;
    if (payload.external_id !== undefined) clean.external_id = payload.external_id ?? null;

    const { error } = await (supabase as any)
      .from('store_store_categories')
      .update(clean)
      .eq('id', payload.id);
    if (error) throw new Error(error.message);
  }

  /** Удаление категории магазина и всех её товаров в магазине */
  static async deleteStoreCategoryWithProducts(storeId: string, categoryId: number): Promise<void> {
    if (!storeId || !categoryId) throw new Error('storeId and categoryId required');
    const { error: prodErr } = await (supabase as any)
      .from('store_products')
      .delete()
      .eq('store_id', storeId)
      .eq('category_id', categoryId);
    if (prodErr) throw new Error(prodErr.message);

    const { error: catErr } = await (supabase as any)
      .from('store_store_categories')
      .delete()
      .eq('store_id', storeId)
      .eq('category_id', categoryId);
    if (catErr) throw new Error(catErr.message);
  }

  /** Массовое удаление категорий магазина и их товаров */
  static async deleteStoreCategoriesWithProducts(storeId: string, categoryIds: number[]): Promise<void> {
    if (!storeId || !Array.isArray(categoryIds) || categoryIds.length === 0) return;
    const ids = categoryIds;
    const { error: prodErr } = await (supabase as any)
      .from('store_products')
      .delete()
      .eq('store_id', storeId)
      .in('category_id', ids);
    if (prodErr) throw new Error(prodErr.message);

    const { error: catErr } = await (supabase as any)
      .from('store_store_categories')
      .delete()
      .eq('store_id', storeId)
      .in('category_id', ids);
    if (catErr) throw new Error(catErr.message);
  }

  /** Убедиться, что категория привязана к магазину (апсерт) */
  static async ensureStoreCategory(storeId: string, categoryId: number, options?: { external_id?: string | null; custom_name?: string | null }): Promise<number | null> {
    if (!storeId || !Number.isFinite(categoryId)) throw new Error('storeId and categoryId required');
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) throw new Error('Invalid session');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: storeOwner, error: storeOwnerErr } = await (supabase as any)
      .from('user_stores')
      .select('id,user_id')
      .eq('id', storeId)
      .maybeSingle();
    if (storeOwnerErr) throw new Error(storeOwnerErr.message);
    if (!storeOwner) throw new Error('Store not found');
    if (String(storeOwner.user_id) !== String(user.id)) throw new Error('store_not_owned_by_user');

    const { data: existing, error: selErr } = await (supabase as any)
      .from('store_store_categories')
      .select('id,is_active,external_id')
      .eq('store_id', storeId)
      .eq('category_id', categoryId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    if (existing?.id) {
      const patch: any = { is_active: true };
      if (options?.external_id !== undefined) patch.external_id = options.external_id;
      if (options?.custom_name !== undefined) patch.custom_name = options.custom_name;
      const { error: updErr } = await (supabase as any)
        .from('store_store_categories')
        .update(patch)
        .eq('id', existing.id);
      if (updErr) throw new Error(updErr.message);
      return Number(existing.id);
    }

    const payload: any = {
      store_id: storeId,
      category_id: Number(categoryId),
      is_active: true,
      external_id: options?.external_id ?? null,
      custom_name: options?.custom_name ?? null,
    };
    const { data: inserted, error: insErr } = await (supabase as any)
      .from('store_store_categories')
      .insert([payload])
      .select('id')
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted?.id ? Number(inserted.id) : null;
  }

  /** Получить внешний ID категории магазина для пары (store_id, category_id) */
  static async getStoreCategoryExternalId(storeId: string, categoryId: number): Promise<string | null> {
    if (!storeId || !Number.isFinite(categoryId)) throw new Error('storeId and categoryId required');
    const { data, error } = await (supabase as any)
      .from('store_store_categories')
      .select('external_id')
      .eq('store_id', storeId)
      .eq('category_id', categoryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as any)?.external_id ?? null;
  }

  static async cleanupUnusedStoreCategory(storeId: string, categoryId: number): Promise<void> {
    if (!storeId || !Number.isFinite(categoryId)) return;
    const { data: prod, error: prodErr } = await (supabase as any)
      .from('store_products')
      .select('id')
      .eq('store_id', storeId)
      .eq('category_id', categoryId)
      .limit(1);
    if (prodErr) return;
    const used = Array.isArray(prod) && prod.length > 0;
    if (used) return;
    await (supabase as any)
      .from('store_store_categories')
      .delete()
      .eq('store_id', storeId)
      .eq('category_id', categoryId);
  }
}
