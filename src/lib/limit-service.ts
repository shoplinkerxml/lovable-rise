import { supabase } from "@/integrations/supabase/client";

export interface LimitTemplate {
  id: number;
  code: string;
  name: string;
  path?: string;
  description?: string;
}

export interface CreateLimitData {
  code: string;
  name: string;
  path?: string;
  description?: string;
}

export interface UpdateLimitData {
  code?: string;
  name?: string;
  path?: string;
  description?: string;
}

export class LimitService {
  /** Отримання списку всіх лімітів */
  static async getLimits(): Promise<LimitTemplate[]> {
    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('limit_templates')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Get limits error:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Отримання одного ліміту за ID */
  static async getLimit(id: number): Promise<LimitTemplate> {
    if (!id) throw new Error("Limit ID is required");

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('limit_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Get limit error:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("Limit not found");
    }

    return data;
  }

  /** Створення нового ліміту */
  static async createLimit(limitData: CreateLimitData): Promise<LimitTemplate> {
    if (!limitData.name?.trim()) {
      throw new Error("Назва обмеження обов'язкова");
    }

    if (!limitData.code?.trim()) {
      throw new Error("Системне ім'я обмеження обов'язкове");
    }

    // Validate code format (snake_case)
    const codeRegex = /^[a-z][a-z0-9_]*$/;
    if (!codeRegex.test(limitData.code.trim())) {
      throw new Error("Системне ім'я має бути в форматі snake_case (тільки малі літери, цифри та _)");
    }

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('limit_templates')
      .insert({
        name: limitData.name.trim(),
        code: limitData.code.trim(),
        path: limitData.path?.trim() || null,
        description: limitData.description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create limit error:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw new Error("Ліміт з таким системним ім'ям вже існує");
      }
      throw new Error(error.message);
    }

    return data;
  }

  /** Оновлення ліміту */
  static async updateLimit(id: number, limitData: UpdateLimitData): Promise<LimitTemplate> {
    if (!id) throw new Error("Limit ID is required");

    const cleanData: any = {};
    
    if (limitData.name !== undefined) {
      if (!limitData.name.trim()) {
        throw new Error("Назва обмеження обов'язкова");
      }
      cleanData.name = limitData.name.trim();
    }
    
    if (limitData.code !== undefined) {
      if (!limitData.code.trim()) {
        throw new Error("Системне ім'я обмеження обов'язкове");
      }
      // Validate code format (snake_case)
      const codeRegex = /^[a-z][a-z0-9_]*$/;
      if (!codeRegex.test(limitData.code.trim())) {
        throw new Error("Системне ім'я має бути в форматі snake_case (тільки малі літери, цифри та _)");
      }
      cleanData.code = limitData.code.trim();
    }
    
    if (limitData.path !== undefined) {
      cleanData.path = limitData.path?.trim() || null;
    }
    
    if (limitData.description !== undefined) {
      cleanData.description = limitData.description?.trim() || null;
    }

    if (Object.keys(cleanData).length === 0) {
      throw new Error("No fields to update");
    }

    // @ts-ignore - table not in generated types yet
    const { data, error } = await (supabase as any)
      .from('limit_templates')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update limit error:', error);
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw new Error("Ліміт з таким системним ім'ям вже існує");
      }
      throw new Error(error.message);
    }

    return data;
  }

  /** Видалення ліміту */
  static async deleteLimit(id: number): Promise<void> {
    if (!id) throw new Error("Limit ID is required");

    // @ts-ignore - table not in generated types yet
    const { error } = await (supabase as any)
      .from('limit_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete limit error:', error);
      throw new Error(error.message);
    }
  }
}
