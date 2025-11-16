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
    store_rz_id: string | null;
    store_rz_id_value: string | null;
    is_active: boolean;
  }>> {
    if (!storeId) throw new Error("Store ID is required");
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) throw new Error("Invalid session");

    const { data, error } = await (supabase as any)
      .from('store_store_categories')
      .select('id,store_id,category_id,custom_name,is_active,external_id,rz_id,rz_id_value, store_categories:category_id(id,external_id,name,parent_external_id,rz_id)')
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
        store_rz_id: r.rz_id ?? null,
        store_rz_id_value: r.rz_id_value ?? null,
        is_active: !!r.is_active,
      };
    });
  }

  /** Обновление полей категории магазина */
  static async updateStoreCategory(payload: {
    id: number;
    rz_id?: string | null;
    rz_id_value?: string | null;
    is_active?: boolean;
    custom_name?: string | null;
    external_id?: string | null;
  }): Promise<void> {
    if (!payload?.id) throw new Error('Category row id is required');
    const clean: any = {};
    if (payload.rz_id !== undefined) clean.rz_id = payload.rz_id;
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
}
