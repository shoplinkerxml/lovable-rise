import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";
import { readCache, writeCache, CACHE_TTL } from "./cache-utils";

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
  private static inFlightSuppliersPromise: Promise<Supplier[]> | null = null;
  private static readonly SOFT_REFRESH_THRESHOLD_MS = 120_000;

  private static getSuppliersCacheKey(userId: string): string {
    return `rq:suppliers:list:${userId}`;
  }

  private static setSuppliersCache(userId: string, rows: Supplier[]): void {
    const key = SupplierService.getSuppliersCacheKey(userId);
    writeCache(key, rows, CACHE_TTL.suppliersList);
  }

  private static getCachedSuppliers(userId: string): { rows: Supplier[]; expiresAt: number } | null {
    const key = SupplierService.getSuppliersCacheKey(userId);
    const cached = readCache<Supplier[]>(key);
    if (!cached || !Array.isArray(cached.data)) return null;
    const expiresAt = typeof cached.expiresAt === "number" ? cached.expiresAt : 0;
    return { rows: cached.data, expiresAt };
  }

  private static async fetchSuppliersFromApi(accessToken: string | null): Promise<Supplier[]> {
    const { data, error } = await supabase.functions.invoke<{ suppliers?: Supplier[] }>("suppliers-list", {
      body: {},
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) return [];
    const payload: { suppliers?: Supplier[] } = typeof data === "string" ? JSON.parse(data as string) : (data as any);
    const rows = Array.isArray(payload?.suppliers) ? payload!.suppliers! : [];
    return rows;
  }

  static clearSuppliersCache(): void {
    SupplierService.inFlightSuppliersPromise = null;
    try {
      if (typeof window === "undefined") return;
      const storages: Storage[] = [];
      try {
        storages.push(window.localStorage);
      } catch {
        void 0;
      }
      try {
        storages.push(window.sessionStorage);
      } catch {
        void 0;
      }
      for (const s of storages) {
        const keys: string[] = [];
        for (let i = 0; i < s.length; i++) {
          const k = s.key(i);
          if (!k) continue;
          if (
            k.startsWith("rq:suppliers:list:") ||
            k.startsWith("v1:rq:suppliers:list:")
          ) {
            keys.push(k);
          }
        }
        for (const k of keys) {
          try {
            s.removeItem(k);
          } catch {
            void 0;
          }
        }
      }
    } catch {
      void 0;
    }
  }

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

    const { data: auth } = await supabase.auth.getSession();
    const accessToken: string | null = auth?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<{ value?: number }>("suppliers-limit", {
      body: {},
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) return 0;
    const payload = typeof data === "string" ? (JSON.parse(data) as { value?: number }) : (data as { value?: number });
    return Number(payload?.value || 0);
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
    const list = await SupplierService.getSuppliers();
    return Array.isArray(list) ? list.length : 0;
  }

  static async getSuppliersCountCached(): Promise<number> {
    return await this.getSuppliersCount();
  }

  /** Отримання списку постачальників поточного користувача */
  static async getSuppliers(): Promise<Supplier[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    const userId = sessionValidation.user?.id ? String(sessionValidation.user.id) : "";
    const cached = userId ? SupplierService.getCachedSuppliers(userId) : null;
    if (cached) {
      const timeLeft = cached.expiresAt - Date.now();
      if (timeLeft > 0 && userId) {
        if (timeLeft < SupplierService.SOFT_REFRESH_THRESHOLD_MS) {
          void (async () => {
            try {
              const { data: auth } = await supabase.auth.getSession();
              const accessToken: string | null = auth?.session?.access_token || null;
              const rows = await SupplierService.fetchSuppliersFromApi(accessToken);
              SupplierService.setSuppliersCache(userId, rows);
            } catch {
              void 0;
            }
          })();
        }
        return cached.rows;
      }
    }

    if (SupplierService.inFlightSuppliersPromise) {
      return SupplierService.inFlightSuppliersPromise;
    }

    SupplierService.inFlightSuppliersPromise = (async () => {
      const { data: auth } = await supabase.auth.getSession();
      const accessToken: string | null = auth?.session?.access_token || null;
      const rows = await SupplierService.fetchSuppliersFromApi(accessToken);
      if (userId) {
        SupplierService.setSuppliersCache(userId, rows);
      }
      return rows;
    })();

    try {
      const rows = await SupplierService.inFlightSuppliersPromise;
      return rows;
    } finally {
      SupplierService.inFlightSuppliersPromise = null;
    }
  }

  /** Отримання одного постачальника за ID */
  static async getSupplier(id: number): Promise<Supplier> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const list = await SupplierService.getSuppliers();
    const found = list.find((s) => Number(s.id) === Number(id));
    if (!found) throw new Error("Supplier not found");
    return found;
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
    const userId = sessionValidation.user?.id ? String(sessionValidation.user.id) : "";

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const xmlUrl = supplierData.xml_feed_url ? supplierData.xml_feed_url.trim() : '';

    const { data: auth } = await supabase.auth.getSession();
    const accessToken: string | null = auth?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<{ supplier?: Supplier }>('suppliers-create', {
      body: {
        supplier_name: supplierData.supplier_name.trim(),
        website_url: supplierData.website_url?.trim() || null,
        xml_feed_url: xmlUrl ? xmlUrl : null,
        phone: supplierData.phone?.trim() || null,
      },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) throw new Error(error.message ?? 'Create failed');
    const payload: { supplier?: Supplier } = typeof data === 'string' ? JSON.parse(data as string) : (data as any);
    const row = payload?.supplier as Supplier | undefined;
    if (!row) throw new Error('Create failed');
    if (userId) {
      const cached = SupplierService.getCachedSuppliers(userId);
      const next = [row, ...(cached?.rows || [])].filter((v) => v && typeof v === "object");
      SupplierService.setSuppliersCache(userId, next);
    }
    return row;
  }

  /** Оновлення постачальника */
  static async updateSupplier(id: number, supplierData: UpdateSupplierData): Promise<Supplier> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    const userId = sessionValidation.user?.id ? String(sessionValidation.user.id) : "";

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

    const { data: auth } = await supabase.auth.getSession();
    const accessToken: string | null = auth?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<{ supplier?: Supplier }>('suppliers-update', {
      body: { id, ...cleanData },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) throw new Error(error.message ?? 'Update failed');
    const payload: { supplier?: Supplier } = typeof data === 'string' ? JSON.parse(data as string) : (data as any);
    const row = payload?.supplier as Supplier | undefined;
    if (!row) throw new Error('Update failed');
    if (userId) {
      const cached = SupplierService.getCachedSuppliers(userId);
      const prev = cached?.rows || [];
      const next = prev.map((s) => (Number(s.id) === Number(row.id) ? row : s));
      const exists = next.some((s) => Number(s.id) === Number(row.id));
      SupplierService.setSuppliersCache(userId, exists ? next : [row, ...next]);
    }
    return row;
  }

  /** Видалення постачальника */
  static async deleteSupplier(id: number): Promise<void> {
    if (!id) throw new Error("Supplier ID is required");

    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    const userId = sessionValidation.user?.id ? String(sessionValidation.user.id) : "";

    const { data: auth } = await supabase.auth.getSession();
    const accessToken: string | null = auth?.session?.access_token || null;
    const { error } = await supabase.functions.invoke<{ ok?: boolean }>('suppliers-delete', {
      body: { id },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) throw new Error(error.message ?? 'Delete failed');
    if (userId) {
      const cached = SupplierService.getCachedSuppliers(userId);
      const prev = cached?.rows || [];
      const next = prev.filter((s) => Number(s.id) !== Number(id));
      SupplierService.setSuppliersCache(userId, next);
    }
  }
}
