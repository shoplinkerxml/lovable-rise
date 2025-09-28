import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Tariff = Database['public']['Tables']['tariffs']['Row'];
export type TariffInsert = Database['public']['Tables']['tariffs']['Insert'];
export type TariffUpdate = Database['public']['Tables']['tariffs']['Update'];

export type TariffFeature = Database['public']['Tables']['tariff_features']['Row'];
export type TariffFeatureInsert = Database['public']['Tables']['tariff_features']['Insert'];
export type TariffFeatureUpdate = Database['public']['Tables']['tariff_features']['Update'];

export type TariffLimit = Database['public']['Tables']['tariff_limits']['Row'];
export type TariffLimitInsert = Database['public']['Tables']['tariff_limits']['Insert'];
export type TariffLimitUpdate = Database['public']['Tables']['tariff_limits']['Update'];

export type Currency = Database['public']['Tables']['currencies']['Row'];

export interface TariffWithDetails extends Tariff {
  currency_data: Currency;
  features: TariffFeature[];
  limits: TariffLimit[];
}

export class TariffService {
  // Get all tariffs with currency data, features, and limits
  static async getAllTariffs(includeInactive = false) {
    try {
      let query = supabase
        .from('tariffs')
        .select(`
          *,
          currency_data:currencies(*),
          tariff_features(*),
          tariff_limits(*)
        `)
        .order('name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our TariffWithDetails interface
      return data.map(tariff => ({
        id: tariff.id,
        name: tariff.name,
        description: tariff.description,
        old_price: tariff.old_price,
        new_price: tariff.new_price,
        currency: tariff.currency,
        duration_days: tariff.duration_days,
        is_free: tariff.is_free,
        is_lifetime: tariff.is_lifetime,
        is_active: tariff.is_active,
        created_at: tariff.created_at,
        updated_at: tariff.updated_at,
        currency_data: tariff.currency_data,
        features: tariff.tariff_features,
        limits: tariff.tariff_limits
      })) as TariffWithDetails[];
    } catch (error) {
      console.error('Error fetching tariffs:', error);
      throw error;
    }
  }

  // Get tariff by ID with features and limits
  static async getTariffById(id: number) {
    try {
      const { data, error } = await supabase
        .from('tariffs')
        .select(`
          *,
          currency_data:currencies(*),
          tariff_features(*),
          tariff_limits(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Transform the data to match our interface
      const tariffWithDetails: TariffWithDetails = {
        id: data.id,
        name: data.name,
        description: data.description,
        old_price: data.old_price,
        new_price: data.new_price,
        currency: data.currency,
        duration_days: data.duration_days,
        is_free: data.is_free,
        is_lifetime: data.is_lifetime,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
        currency_data: data.currency_data,
        features: data.tariff_features,
        limits: data.tariff_limits
      };
      
      return tariffWithDetails;
    } catch (error) {
      console.error('Error fetching tariff:', error);
      throw error;
    }
  }

  // Create a new tariff
  static async createTariff(tariffData: TariffInsert) {
    try {
      const { data, error } = await supabase
        .from('tariffs')
        .insert(tariffData)
        .select(`
          *,
          currency_data:currencies(*)
        `)
        .single();

      if (error) throw error;
      return data as (Tariff & { currency_data: Currency });
    } catch (error) {
      console.error('Error creating tariff:', error);
      throw error;
    }
  }

  // Update a tariff
  static async updateTariff(id: number, tariffData: TariffUpdate) {
    try {
      const { data, error } = await supabase
        .from('tariffs')
        .update(tariffData)
        .eq('id', id)
        .select(`
          *,
          currency_data:currencies(*)
        `)
        .single();

      if (error) throw error;
      return data as (Tariff & { currency_data: Currency });
    } catch (error) {
      console.error('Error updating tariff:', error);
      throw error;
    }
  }

  // Delete a tariff
  static async deleteTariff(id: number) {
    try {
      const { error } = await supabase
        .from('tariffs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tariff:', error);
      throw error;
    }
  }

  // Get all features for a tariff
  static async getTariffFeatures(tariffId: number) {
    try {
      const { data, error } = await supabase
        .from('tariff_features')
        .select('*')
        .eq('tariff_id', tariffId)
        .eq('is_active', true)
        .order('feature_name');

      if (error) throw error;
      return data as TariffFeature[];
    } catch (error) {
      console.error('Error fetching tariff features:', error);
      throw error;
    }
  }

  // Add a feature to a tariff
  static async addTariffFeature(featureData: TariffFeatureInsert) {
    try {
      const { data, error } = await supabase
        .from('tariff_features')
        .insert(featureData)
        .select()
        .single();

      if (error) throw error;
      return data as TariffFeature;
    } catch (error) {
      console.error('Error adding tariff feature:', error);
      throw error;
    }
  }

  // Update a tariff feature
  static async updateTariffFeature(id: number, featureData: TariffFeatureUpdate) {
    try {
      const { data, error } = await supabase
        .from('tariff_features')
        .update(featureData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TariffFeature;
    } catch (error) {
      console.error('Error updating tariff feature:', error);
      throw error;
    }
  }

  // Delete a tariff feature
  static async deleteTariffFeature(id: number) {
    try {
      const { error } = await supabase
        .from('tariff_features')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tariff feature:', error);
      throw error;
    }
  }

  // Get all limits for a tariff
  static async getTariffLimits(tariffId: number) {
    try {
      const { data, error } = await supabase
        .from('tariff_limits')
        .select('*')
        .eq('tariff_id', tariffId)
        .eq('is_active', true)
        .order('limit_name');

      if (error) throw error;
      return data as TariffLimit[];
    } catch (error) {
      console.error('Error fetching tariff limits:', error);
      throw error;
    }
  }

  // Add a limit to a tariff
  static async addTariffLimit(limitData: TariffLimitInsert) {
    try {
      const { data, error } = await supabase
        .from('tariff_limits')
        .insert(limitData)
        .select()
        .single();

      if (error) throw error;
      return data as TariffLimit;
    } catch (error) {
      console.error('Error adding tariff limit:', error);
      throw error;
    }
  }

  // Update a tariff limit
  static async updateTariffLimit(id: number, limitData: TariffLimitUpdate) {
    try {
      const { data, error } = await supabase
        .from('tariff_limits')
        .update(limitData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TariffLimit;
    } catch (error) {
      console.error('Error updating tariff limit:', error);
      throw error;
    }
  }

  // Delete a tariff limit
  static async deleteTariffLimit(id: number) {
    try {
      const { error } = await supabase
        .from('tariff_limits')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tariff limit:', error);
      throw error;
    }
  }

  // Get all currencies
  static async getAllCurrencies() {
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('status', true)
        .order('code');

      if (error) throw error;
      return data as Currency[];
    } catch (error) {
      console.error('Error fetching currencies:', error);
      throw error;
    }
  }
}