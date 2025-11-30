// src/lib/admin-service.ts
import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";
import type { TariffInsert, TariffUpdate, TariffFeatureInsert, TariffFeatureUpdate, TariffLimitInsert, TariffLimitUpdate } from "./tariff-service";

type AdminErrorCode = 'unauthorized' | 'validation_failed' | 'db_error' | 'rpc_error' | 'not_found';
type AdminResult<T> = { success: boolean; data?: T; errorCode?: AdminErrorCode; message?: string };

async function ensureAccessToken(): Promise<string> {
  const v = await SessionValidator.ensureValidSession();
  if (!v.isValid || !v.accessToken) throw Object.assign(new Error('Invalid session'), { status: 401 });
  return v.accessToken;
}

async function invokeAdminEdge<T>(fn: string, body: unknown): Promise<AdminResult<T>> {
  try {
    const token = await ensureAccessToken();
    const { data, error } = await supabase.functions.invoke(fn, { body, headers: { Authorization: `Bearer ${token}` } });
    if (error) return { success: false, errorCode: 'rpc_error', message: (error as { message?: string })?.message || 'rpc_failed' };
    const payload = typeof data === 'string' ? (JSON.parse(data as string) as T) : (data as T);
    return { success: true, data: payload };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    const code: AdminErrorCode = status === 401 ? 'unauthorized' : 'rpc_error';
    return { success: false, errorCode: code, message: (e as { message?: string })?.message };
  }
}

async function runDb<T>(op: () => Promise<T>): Promise<AdminResult<T>> {
  try {
    await ensureAccessToken();
    const res = await op();
    return { success: true, data: res };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    const msg = (e as { message?: string })?.message;
    let code: AdminErrorCode = 'db_error';
    if (status === 401) code = 'unauthorized';
    else if (status === 404) code = 'not_found';
    else if (status === 422) code = 'validation_failed';
    return { success: false, errorCode: code, message: msg };
  }
}

export class AdminService {
  // ==================== TARIFF OPERATIONS ====================
  
  static async createTariff(data: TariffInsert): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('tariffs')
        .insert(data)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async updateTariff(id: number, data: TariffUpdate): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('tariffs')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async deleteTariff(id: number): Promise<AdminResult<{ success: boolean }>> {
    return runDb(async () => {
      const { error } = await supabase
        .from('tariffs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    });
  }

  // ==================== TARIFF FEATURES ====================
  
  static async createTariffFeature(data: TariffFeatureInsert): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('tariff_features')
        .insert(data)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async updateTariffFeature(id: number, data: TariffFeatureUpdate): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('tariff_features')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async deleteTariffFeature(id: number): Promise<AdminResult<{ success: boolean }>> {
    return runDb(async () => {
      const { error } = await supabase
        .from('tariff_features')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    });
  }

  // ==================== TARIFF LIMITS ====================
  
  static async createTariffLimit(data: TariffLimitInsert): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('tariff_limits')
        .insert(data)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async updateTariffLimit(id: number, data: TariffLimitUpdate): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('tariff_limits')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async deleteTariffLimit(id: number): Promise<AdminResult<{ success: boolean }>> {
    return runDb(async () => {
      const { error } = await supabase
        .from('tariff_limits')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    });
  }

  // ==================== SUBSCRIPTION OPERATIONS ====================
  
  static async activateUserTariff(userId: string, tariffId: number): Promise<AdminResult<unknown>> {
    const edge = await invokeAdminEdge<unknown>('admin-activate-tariff', { userId, tariffId });
    if (edge.success) return edge;
    return runDb(async () => {
      const { error: deactivateError } = await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
      if (deactivateError) throw deactivateError;
      const { data: tariff, error: tariffError } = await supabase
        .from('tariffs')
        .select('duration_days, is_lifetime')
        .eq('id', tariffId)
        .single();
      if (tariffError) throw tariffError;
      const startDate = new Date();
      let endDate: Date | null = null;
      if (!tariff.is_lifetime && tariff.duration_days) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + tariff.duration_days);
      }
      const { data: newSubscription, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          tariff_id: tariffId,
          start_date: startDate.toISOString(),
          end_date: endDate ? endDate.toISOString() : null,
          is_active: true
        })
        .select(`
          *,
          tariffs (id,name,description,new_price,currency_id,duration_days,is_lifetime)
        `)
        .single();
      if (insertError) throw insertError;
      return newSubscription;
    });
  }

  static async deactivateUserTariff(subscriptionId: number): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('id', subscriptionId)
        .select()
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async deleteSubscription(subscriptionId: number): Promise<AdminResult<{ success: boolean }>> {
    return runDb(async () => {
      const { data: subscription, error: checkError } = await supabase
        .from('user_subscriptions')
        .select('is_active')
        .eq('id', subscriptionId)
        .single();
      if (checkError) throw checkError;
      if (subscription.is_active) throw Object.assign(new Error('Cannot delete active subscription'), { status: 422 });
      const { error } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('id', subscriptionId);
      if (error) throw error;
      return { success: true };
    });
  }

  // ==================== CURRENCY OPERATIONS ====================
  
  static async createCurrency(data: { code: string; name: string; rate: number; is_base?: boolean; status?: boolean }): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('currencies')
        .insert(data)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async updateCurrency(id: number, data: Partial<{ code: string; name: string; rate: number; is_base: boolean; status: boolean }>): Promise<AdminResult<unknown>> {
    return runDb(async () => {
      const { data: result, error } = await supabase
        .from('currencies')
        .update(data)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return result;
    });
  }

  static async deleteCurrency(id: number): Promise<AdminResult<{ success: boolean }>> {
    return runDb(async () => {
      const { error } = await supabase
        .from('currencies')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    });
  }

  static async bulkUpsertTariffFeatures(items: Array<(TariffFeatureInsert & { id?: number }) | TariffFeatureUpdate>): Promise<AdminResult<unknown>> {
    const edge = await invokeAdminEdge<unknown>('admin-bulk-upsert-tariff-features', { items });
    if (edge.success) return edge;
    return runDb(async () => {
      const inserts: TariffFeatureInsert[] = [];
      const updates: Array<{ id: number; data: TariffFeatureUpdate }> = [];
      for (const it of items) {
        const id = (it as { id?: number }).id;
        if (id) {
          const d = { ...it } as TariffFeatureUpdate;
          delete (d as unknown as { id?: number }).id;
          updates.push({ id, data: d });
        } else {
          inserts.push(it as TariffFeatureInsert);
        }
      }
      if (inserts.length) {
        const { error: upsertError } = await supabase
          .from('tariff_features')
          .upsert(inserts, { onConflict: 'id' });
        if (upsertError) throw upsertError;
      }
      if (updates.length) {
        for (const { id, data } of updates) {
          const { error: updateError } = await supabase
            .from('tariff_features')
            .update(data)
            .eq('id', id);
          if (updateError) throw updateError;
        }
      }
      const ids = Array.from(new Set(items.map(i => (i as { tariff_id?: number }).tariff_id).filter(Boolean))) as number[];
      if (ids.length) {
        const { data, error } = await supabase
          .from('tariff_features')
          .select('*')
          .in('tariff_id', ids);
        if (error) throw error;
        return data;
      }
      return [] as unknown[];
    });
  }
}
