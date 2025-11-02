import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";

export interface Supplier {
  id: string;
  user_id: string;
  supplier_name: string;
  website_url?: string;
  xml_feed_url: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  supplier_name: string;
  website_url?: string;
  xml_feed_url: string;
  phone?: string;
}

export interface UpdateSupplierData {
  supplier_name?: string;
  website_url?: string;
  xml_feed_url?: string;
  phone?: string;
}

export interface SupplierLimitInfo {
  current: number;
  max: number;
  canCreate: boolean;
}

export class SupplierService {
  /** Получение только максимального лимита поставщиков (без подсчета текущих) */
  static async getSupplierLimitOnly(): Promise<number> {
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

    // Get the supplier limit directly from tariff_limits by limit_name
    const { data: limitData, error: limitError } = await supabase
      .from('tariff_limits')
      .select('value')
      .eq('tariff_id', subscription.tariff_id)
      .ilike('limit_name', '%постачальник%')
      .eq('is_active', true)
      .maybeSingle();

    if (limitError) {
      console.error('Error fetching tariff limit:', limitError);
      return 0;
    }

    return limitData?.value || 0;
  }

  /** Получение лимита поставщиков для текущего пользователя */
  static async getSupplierLimit(): Promise<SupplierLimitInfo> {
    const maxSuppliers = await this.getSupplierLimitOnly();
    const currentCount = await this.getSuppliersCount();

    return {
      current: currentCount,
      max: maxSuppliers,
      canCreate: currentCount < maxSuppliers
    };
  }

  /** Получение количества поставщиков текущего пользователя */
  static async getSuppliersCount(): Promise<number> {
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
      .from('user_suppliers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Get suppliers count error:', error);
      return 0;
    }

    return count || 0;
  }

  /** Отримання списку постачальників поточного користувача */
  static async getSuppliers(): Promise<Supplier[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    try {
      // @ts-ignore - table not in generated types yet
      const { data, error } = await (supabase as any)
        .from('user_suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get suppliers error:', error);
        // Return empty array instead of throwing error for empty table
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get suppliers error:', error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  /** Отримання одного постачальника за ID */
  static async getSupplier(id: string): Promise<Supplier> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('user_suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get supplier error:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Supplier not found");
    }

    return data;
  }

  /** Створення нового постачальника */
  static async createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
    if (!supplierData.supplier_name?.trim()) {
      throw new Error("Назва постачальника обов'язкова");
    }

    if (!supplierData.xml_feed_url?.trim()) {
      throw new Error("Посилання на прайс обов'язкове");
    }

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user can create more suppliers
    const limitInfo = await this.getSupplierLimit();
    if (!limitInfo.canCreate) {
      throw new Error(`Досягнуто ліміту постачальників (${limitInfo.max}). Оновіть тарифний план.`);
    }

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('user_suppliers')
      .insert({
        user_id: user.id,
        supplier_name: supplierData.supplier_name.trim(),
        website_url: supplierData.website_url?.trim() || null,
        xml_feed_url: supplierData.xml_feed_url.trim(),
        phone: supplierData.phone?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create supplier error:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /** Оновлення постачальника */
  static async updateSupplier(id: string, supplierData: UpdateSupplierData): Promise<Supplier> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const cleanData: any = {};
    if (supplierData.supplier_name !== undefined) {
      if (!supplierData.supplier_name.trim()) {
        throw new Error("Назва постачальника обов'язкова");
      }
      cleanData.supplier_name = supplierData.supplier_name.trim();
    }
    if (supplierData.xml_feed_url !== undefined) {
      if (!supplierData.xml_feed_url.trim()) {
        throw new Error("Посилання на прайс обов'язкове");
      }
      cleanData.xml_feed_url = supplierData.xml_feed_url.trim();
    }
    if (supplierData.website_url !== undefined) {
      cleanData.website_url = supplierData.website_url?.trim() || null;
    }
    if (supplierData.phone !== undefined) {
      cleanData.phone = supplierData.phone?.trim() || null;
    }

    if (Object.keys(cleanData).length === 0) {
      throw new Error("No fields to update");
    }

    cleanData.updated_at = new Date().toISOString();

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('user_suppliers')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update supplier error:', error);
      throw new Error(error.message);
    }

    return data;
  }

  /** Видалення постачальника */
  static async deleteSupplier(id: string): Promise<void> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // @ts-ignore - table not in generated types yet
    const { error } = await (supabase as any)
      .from('user_suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete supplier error:', error);
      throw new Error(error.message);
    }
  }
}
