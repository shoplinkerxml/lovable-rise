// src/lib/admin-service.ts
import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";
import type { TariffInsert, TariffUpdate } from "./tariff-service";

export class AdminService {
  // ==================== TARIFF OPERATIONS ====================
  
  static async createTariff(data: TariffInsert) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('tariffs')
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async updateTariff(id: number, data: TariffUpdate) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('tariffs')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async deleteTariff(id: number) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { error } = await supabase
      .from('tariffs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // ==================== TARIFF FEATURES ====================
  
  static async createTariffFeature(data: any) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('tariff_features')
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async updateTariffFeature(id: number, data: any) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('tariff_features')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async deleteTariffFeature(id: number) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { error } = await supabase
      .from('tariff_features')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // ==================== TARIFF LIMITS ====================
  
  static async createTariffLimit(data: any) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('tariff_limits')
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async updateTariffLimit(id: number, data: any) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('tariff_limits')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async deleteTariffLimit(id: number) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { error } = await supabase
      .from('tariff_limits')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  // ==================== SUBSCRIPTION OPERATIONS ====================
  
  static async activateUserTariff(userId: string, tariffId: number) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    // 1. Деактивируем все активные подписки
    const { error: deactivateError } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (deactivateError) throw deactivateError;

    // 2. Получаем данные тарифа
    const { data: tariff, error: tariffError } = await supabase
      .from('tariffs')
      .select('duration_days, is_lifetime')
      .eq('id', tariffId)
      .single();

    if (tariffError) throw tariffError;

    // 3. Создаем новую подписку
    const startDate = new Date();
    let endDate = null;

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
        tariffs (
          id,
          name,
          description,
          new_price,
          currency_id,
          duration_days,
          is_lifetime
        )
      `)
      .single();

    if (insertError) throw insertError;
    return newSubscription;
  }

  static async deactivateUserTariff(subscriptionId: number) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async deleteSubscription(subscriptionId: number) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    // Проверяем что подписка неактивна
    const { data: subscription, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('is_active')
      .eq('id', subscriptionId)
      .single();

    if (checkError) throw checkError;
    if (subscription.is_active) {
      throw new Error("Cannot delete active subscription");
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) throw error;
    return { success: true };
  }

  // ==================== CURRENCY OPERATIONS ====================
  
  static async createCurrency(data: { code: string; name: string; rate: number; is_base?: boolean; status?: boolean }) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('currencies')
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async updateCurrency(id: number, data: Partial<{ code: string; name: string; rate: number; is_base: boolean; status: boolean }>) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { data: result, error } = await supabase
      .from('currencies')
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return result;
  }

  static async deleteCurrency(id: number) {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session");
    }

    const { error } = await supabase
      .from('currencies')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}