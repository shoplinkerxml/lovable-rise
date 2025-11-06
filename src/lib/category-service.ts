import { supabase } from "@/integrations/supabase/client";

// Minimal DTO shape aligned with new API select
export type StoreCategory = {
  external_id: string;
  name: string;
  parent_external_id: string | null;
};

export interface CreateCategoryInput {
  supplier_id: string | number;
  external_id: string;
  name: string;
  store_id?: string;
  parent_external_id?: string;
}

export const CategoryService = {
  async listCategories(supplierId?: string | number): Promise<StoreCategory[]> {
    const client = supabase as any;
    let query = client
      .from('store_categories')
      .select('external_id,name,parent_external_id')
      .order('name');

    if (supplierId !== undefined && supplierId !== null) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as unknown as StoreCategory[]) || [];
  },

  async createCategory(input: CreateCategoryInput): Promise<StoreCategory> {
    const payload: any = {
      supplier_id: input.supplier_id,
      external_id: input.external_id,
      name: input.name,
      parent_external_id: input.parent_external_id ?? null,
    };

    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .insert([payload])
      .select('external_id,name,parent_external_id')
      .single();
    if (error) throw error;
    return data as unknown as StoreCategory;
  },
};