import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";

export interface Supplier {
  id: number;
  user_id: string;
  supplier_name: string;
  website_url: string | null;
  xml_feed_url: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
  address?: string | null;
  is_active?: boolean | null;
}

export interface CreateSupplierData {
  supplier_name: string;
  website_url?: string;
  xml_feed_url?: string | null;
  phone?: string;
}

export interface UpdateSupplierData {
  supplier_name?: string;
  website_url?: string;
  xml_feed_url?: string | null;
  phone?: string;
}

export interface SupplierLimitInfo {
  current: number;
  max: number;
  canCreate: boolean;
}

export class SupplierService {
  private static lastBackgroundRefreshAt = 0;
  private static backgroundRefreshInFlight = false;

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

    try {
      if (typeof window !== 'undefined') {
        const p = window.location.pathname.toLowerCase();
        const allowed = p.includes('/user/suppliers');
        if (!allowed) {
          return 0;
        }
      }
    } catch { /* ignore */ }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { count, error } = await supabase
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
      const cacheKey = 'rq:suppliers:list';
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { items: Supplier[]; expiresAt: number };
        if (parsed && Array.isArray(parsed.items) && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
          const timeLeft = parsed.expiresAt - Date.now();
          const refreshThresholdMs = 2 * 60 * 1000;
          if (timeLeft < refreshThresholdMs && !SupplierService.backgroundRefreshInFlight && Date.now() - SupplierService.lastBackgroundRefreshAt > 60 * 1000) {
            SupplierService.backgroundRefreshInFlight = true;
            SupplierService.lastBackgroundRefreshAt = Date.now();
            (async () => {
              try {
                const { data: auth } = await supabase.auth.getSession();
                const accessToken: string | null = auth?.session?.access_token || null;
                const timeoutMs = 4000;
                const invokePromise = supabase.functions.invoke<{ suppliers?: Supplier[] }>('suppliers-list', {
                  body: {},
                  headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                });
                const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
                const resp = await Promise.race([invokePromise, timeoutPromise]);
                let rows: Supplier[] | null = null;
                if (resp && typeof resp === 'object' && resp !== null) {
                  const r = resp as { data: unknown; error: unknown };
                  if (r.error == null) {
                    const payload: { suppliers?: Supplier[] } = typeof r.data === 'string'
                      ? (JSON.parse(r.data as string) as { suppliers?: Supplier[] })
                      : (r.data as { suppliers?: Supplier[] });
                    rows = Array.isArray(payload?.suppliers) ? payload!.suppliers! : null;
                  }
                }
                if (!rows) {
                  const { data, error } = await supabase
                    .from('user_suppliers')
                    .select('id,user_id,supplier_name,website_url,xml_feed_url,phone,created_at,updated_at,is_active')
                    .eq('user_id', sessionValidation.user.id)
                    .order('created_at', { ascending: false });
                  rows = error ? null : (data || []);
                }
                if (rows) {
                  try {
                    const payload = JSON.stringify({ items: rows, expiresAt: Date.now() + 900_000 });
                    if (typeof window !== 'undefined') window.localStorage.setItem(cacheKey, payload);
                  } catch { /* noop */ }
                }
              } catch { /* noop */ }
              finally {
                SupplierService.backgroundRefreshInFlight = false;
              }
            })();
          }
          return parsed.items;
        }
      }
    } catch (_e) { void 0; }

    try {
      const { data: auth } = await supabase.auth.getSession();
      const accessToken: string | null = auth?.session?.access_token || null;
      const timeoutMs = 4000;
      const invokePromise = supabase.functions.invoke<{ suppliers?: Supplier[] }>('suppliers-list', {
        body: {},
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
      const resp = await Promise.race([invokePromise, timeoutPromise]);
      if (resp && typeof resp === 'object' && resp !== null) {
        const r = resp as { data: unknown; error: unknown };
        if (r.error == null) {
          const payload: { suppliers?: Supplier[] } = typeof r.data === 'string'
            ? (JSON.parse(r.data as string) as { suppliers?: Supplier[] })
            : (r.data as { suppliers?: Supplier[] });
          const rows = payload?.suppliers;
          if (Array.isArray(rows)) return rows;
        }
      }
    } catch (_e) { void 0; }

    try {
      const { data, error } = await supabase
        .from('user_suppliers')
        .select('id,user_id,supplier_name,website_url,xml_feed_url,phone,created_at,updated_at,is_active')
        .eq('user_id', sessionValidation.user.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } catch (_e) {
      return [];
    }
  }

  /** Отримання одного постачальника за ID */
  static async getSupplier(id: number): Promise<Supplier> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await supabase
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

    // xml_feed_url є НЕобов'язковим

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

    const xmlUrl = supplierData.xml_feed_url ? supplierData.xml_feed_url.trim() : '';

    const { data, error } = await supabase
      .from('user_suppliers')
      .insert({
        user_id: user.id,
        supplier_name: supplierData.supplier_name.trim(),
        website_url: supplierData.website_url?.trim() || null,
        xml_feed_url: xmlUrl ? xmlUrl : null,
        phone: supplierData.phone?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create supplier error:', error);
      throw new Error(error.message);
    }

    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:suppliers:list'); } catch (_e) { void 0; }
    return data;
  }

  /** Оновлення постачальника */
  static async updateSupplier(id: number, supplierData: UpdateSupplierData): Promise<Supplier> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const cleanData: Partial<Pick<Supplier, 'supplier_name' | 'website_url' | 'xml_feed_url' | 'phone'>> & { updated_at?: string } = {};
    if (supplierData.supplier_name !== undefined) {
      if (!supplierData.supplier_name.trim()) {
        throw new Error("Назва постачальника обов'язкова");
      }
      cleanData.supplier_name = supplierData.supplier_name.trim();
    }
    if (supplierData.xml_feed_url !== undefined) {
      const trimmed = (supplierData.xml_feed_url ?? '').toString().trim();
      // Порожній рядок означає очистити значення до null
      cleanData.xml_feed_url = trimmed ? trimmed : null;
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

    const { data, error } = await supabase
      .from('user_suppliers')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update supplier error:', error);
      throw new Error(error.message);
    }

    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:suppliers:list'); } catch (_e) { void 0; }
    return data;
  }

  /** Видалення постачальника */
  static async deleteSupplier(id: number): Promise<void> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { error } = await supabase
      .from('user_suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete supplier error:', error);
      throw new Error(error.message);
    }
    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:suppliers:list'); } catch (_e) { void 0; }
  }
}
