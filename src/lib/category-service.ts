import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type StoreCategory = Tables<'store_categories'>;

export interface CreateCategoryInput {
  supplier_id: string;
  external_id: string;
  name: string;
  store_id?: string;
  parent_external_id?: string;
}

export const CategoryService = {
  async listCategories(): Promise<StoreCategory[]> {
    const { data, error } = await supabase
      .from('store_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data as StoreCategory[]) || [];
  },

  async createCategory(input: CreateCategoryInput): Promise<StoreCategory> {
    let parentId: string | undefined;
    if (input.parent_external_id) {
      const { data: parentData, error: parentError } = await supabase
        .from('store_categories')
        .select('id')
        .eq('external_id', input.parent_external_id)
        .limit(1)
        .single();
      if (parentError && parentError.code !== 'PGRST116') {
        throw parentError;
      }
      parentId = (parentData as any)?.id;
    }

    const payload: any = {
      external_id: input.external_id,
      name: input.name,
      parent_id: parentId,
    };

    const { data, error } = await supabase
      .from('store_categories')
      .insert([payload])
      .select('*')
      .single();
    if (error) throw error;
    return data as StoreCategory;
  },
};