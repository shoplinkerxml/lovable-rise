import { supabase } from "@/integrations/supabase/client";

// Minimal DTO shape aligned with UI needs
export type StoreCategory = {
  external_id: string;
  name: string;
  parent_external_id: string | null;
};

// Extended DTO used for admin views and precise queries
export type StoreCategoryFull = StoreCategory & {
  id: string; // keep as string to avoid numeric/uuid ambiguity in UI
  supplier_id: string;
};

export interface CreateCategoryInput {
  supplier_id: string | number;
  external_id: string;
  name: string;
  store_id?: string;
  parent_external_id?: string | null;
}

function normalizeSupplierId(supplierId?: string | number): number | undefined {
  if (supplierId === undefined || supplierId === null) return undefined;
  if (typeof supplierId === 'number') return supplierId;
  const parsed = Number(supplierId);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function handleError(error: any): never {
  // Preserve Supabase error object to retain code/details for UI handling
  throw error;
}

export const CategoryService = {
  // 0. Read specific category by internal id
  async getById(id: string | number): Promise<StoreCategoryFull | null> {
    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .select('id,external_id,name,parent_external_id,supplier_id')
      .eq('id', id)
      .maybeSingle();
    if (error) handleError(error);
    if (!data) return null;
    const r: any = data;
    return {
      id: String(r.id),
      external_id: r.external_id,
      name: r.name,
      parent_external_id: r.parent_external_id,
      supplier_id: String(r.supplier_id),
    };
  },

  // 0a. Read category name by internal id (safe)
  async getNameByIdSafe(id: number | string): Promise<string | null> {
    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .select('name')
      .eq('id', id)
      .maybeSingle();
    if (error) return null;
    const r: any = data;
    return r?.name ?? null;
  },
  // 4. Get all categories of supplier
  async listCategories(supplierId?: string | number): Promise<StoreCategory[]> {
    const client = supabase as any;
    const normalized = normalizeSupplierId(supplierId);
    let query = client
      .from('store_categories')
      .select('external_id,name,parent_external_id')
      .order('name');

    if (normalized !== undefined) {
      query = query.eq('supplier_id', normalized);
    }

    const { data, error } = await query;
    if (error) handleError(error);
    return (data as unknown as StoreCategory[]) || [];
  },

  // 1–2. Create category or subcategory
  async createCategory(input: CreateCategoryInput): Promise<StoreCategory> {
    const payload: any = {
      supplier_id: normalizeSupplierId(input.supplier_id),
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
    if (error) handleError(error);
    return data as unknown as StoreCategory;
  },

  // 3. Bulk create
  async bulkCreate(items: CreateCategoryInput[]): Promise<StoreCategory[]> {
    if (!items || items.length === 0) return [];
    const payload = items.map((it) => ({
      supplier_id: normalizeSupplierId(it.supplier_id),
      external_id: it.external_id,
      name: it.name,
      parent_external_id: it.parent_external_id ?? null,
    }));

    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .insert(payload)
      .select('external_id,name,parent_external_id');
    if (error) handleError(error);
    return (data as unknown as StoreCategory[]) || [];
  },

  // 4. Read all categories for supplier (full shape including id)
  async getSupplierCategories(supplierId: string | number): Promise<StoreCategoryFull[]> {
    const normalized = normalizeSupplierId(supplierId);
    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .select('id,external_id,name,parent_external_id,supplier_id')
      .eq('supplier_id', normalized)
      .order('name');
    if (error) handleError(error);
    // Normalize id/supplier_id to string for UI
    const rows = (data ?? []) as any[];
    return rows.map((r) => ({
      id: String(r.id),
      external_id: r.external_id,
      name: r.name,
      parent_external_id: r.parent_external_id,
      supplier_id: String(r.supplier_id),
    }));
  },

  // 5. Read subcategories of a specific category
  async getSubcategories(supplierId: string | number, parentExternalId: string): Promise<StoreCategoryFull[]> {
    const normalized = normalizeSupplierId(supplierId);
    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .select('id,external_id,name,parent_external_id,supplier_id')
      .eq('supplier_id', normalized)
      .eq('parent_external_id', parentExternalId)
      .order('name');
    if (error) handleError(error);
    const rows = (data ?? []) as any[];
    return rows.map((r) => ({
      id: String(r.id),
      external_id: r.external_id,
      name: r.name,
      parent_external_id: r.parent_external_id,
      supplier_id: String(r.supplier_id),
    }));
  },

  // 6. Read specific category by external_id
  async getByExternalId(supplierId: string | number, externalId: string): Promise<StoreCategoryFull | null> {
    const normalized = normalizeSupplierId(supplierId);
    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .select('id,external_id,name,parent_external_id,supplier_id')
      .eq('supplier_id', normalized)
      .in('external_id', [externalId, Number(externalId)])
      .maybeSingle();
    if (error) handleError(error);
    if (!data) return null;
    const r: any = data;
    return {
      id: String(r.id),
      external_id: r.external_id,
      name: r.name,
      parent_external_id: r.parent_external_id,
      supplier_id: String(r.supplier_id),
    };
  },

  // 7. Update category name by external_id and supplier_id
  async updateName(supplierId: string | number, externalId: string, name: string): Promise<StoreCategory> {
    const normalized = normalizeSupplierId(supplierId);
    const client = supabase as any;
    const { data, error } = await client
      .from('store_categories')
      .update({ name })
      .eq('external_id', externalId)
      .eq('supplier_id', normalized)
      .select('external_id,name,parent_external_id')
      .single();
    if (error) handleError(error);
    return data as unknown as StoreCategory;
  },

  // 8. Delete category by external_id and supplier_id
  async deleteCategory(supplierId: string | number, externalId: string): Promise<boolean> {
    const normalized = normalizeSupplierId(supplierId);
    const client = supabase as any;
    const { error } = await client
      .from('store_categories')
      .delete()
      .eq('external_id', externalId)
      .eq('supplier_id', normalized);
    if (error) handleError(error);
    return true;
  },

  // 9. Cascade delete: delete a category and all its descendants for a supplier
  async deleteCategoryCascade(supplierId: string | number, externalId: string): Promise<boolean> {
    const normalized = normalizeSupplierId(supplierId);
    const client = supabase as any;

    // Fetch all categories for supplier (only fields needed for tree traversal)
    const { data, error } = await client
      .from('store_categories')
      .select('external_id,parent_external_id')
      .eq('supplier_id', normalized);
    if (error) handleError(error);

    const rows: { external_id: string; parent_external_id: string | null }[] = (data ?? []) as any[];

    // Build set of external_ids to delete (start with selected node)
    const toDelete = new Set<string>([externalId]);

    // Traverse descendants iteratively to avoid deep recursion
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of rows) {
        const parent = r.parent_external_id ?? undefined;
        if (parent && toDelete.has(String(parent)) && !toDelete.has(r.external_id)) {
          toDelete.add(r.external_id);
          changed = true;
        }
      }
    }

    const ids = Array.from(toDelete);
    if (ids.length === 0) return true;

    const { error: delError } = await client
      .from('store_categories')
      .delete()
      .eq('supplier_id', normalized)
      .in('external_id', ids);
    if (delError) handleError(delError);
    return true;
  },
};
