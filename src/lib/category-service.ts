import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

type StoreCategoryRow = Database["public"]["Tables"]["store_categories"]["Row"];
type StoreCategoryBase = Pick<StoreCategoryRow, "external_id" | "name" | "parent_external_id">;
type StoreCategoryFullRow = Pick<StoreCategoryRow, "id" | "external_id" | "name" | "parent_external_id" | "supplier_id">;

function castNullableNumber(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function categoriesSelect(columns: string, supplierId?: string | number) {
  const normalized = castNullableNumber(supplierId);
  let q = supabase.from("store_categories").select(columns);
  if (normalized !== undefined) q = q.eq("supplier_id", normalized);
  return q;
}

function toFull(row: StoreCategoryFullRow): StoreCategoryFull {
  return {
    id: String(row.id),
    external_id: row.external_id,
    name: row.name,
    parent_external_id: row.parent_external_id,
    supplier_id: String(row.supplier_id),
  };
}

function toBase(row: StoreCategoryBase): StoreCategory {
  return {
    external_id: row.external_id,
    name: row.name,
    parent_external_id: row.parent_external_id,
  };
}

export const CategoryService = {
  // 0. Read specific category by internal id
  async getById(id: string | number): Promise<StoreCategoryFull | null> {
    const idNum = castNullableNumber(id);
    if (idNum === undefined) return null;
    const { data, error } = await supabase
      .from("store_categories")
      .select("id,external_id,name,parent_external_id,supplier_id")
      .eq("id", idNum)
      .returns<StoreCategoryFullRow>()
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return toFull(data as StoreCategoryFullRow);
  },

  // 0a. Read category name by internal id (safe)
  async getNameByIdSafe(id: number | string): Promise<string | null> {
    const idNum = castNullableNumber(id);
    if (idNum === undefined) return null;
    const { data, error } = await supabase
      .from("store_categories")
      .select("name")
      .eq("id", idNum)
      .returns<Pick<StoreCategoryRow, "name">>()
      .maybeSingle();
    if (error) return null;
    return (data as Pick<StoreCategoryRow, "name"> | null)?.name ?? null;
  },
  // 4. Get all categories of supplier
  async listCategories(supplierId?: string | number): Promise<StoreCategory[]> {
    const { data, error } = await categoriesSelect("external_id,name,parent_external_id", supplierId)
      .order("name")
      .returns<StoreCategoryBase[]>();
    if (error) throw error;
    const rows = data ?? [];
    return rows.map(toBase);
  },

  // 1–2. Create category or subcategory
  async createCategory(input: CreateCategoryInput): Promise<StoreCategory> {
    const payload = {
      supplier_id: castNullableNumber(input.supplier_id),
      external_id: input.external_id,
      name: input.name,
      parent_external_id: input.parent_external_id ?? null,
    };
    const { data, error } = await supabase
      .from("store_categories")
      .insert([payload])
      .select("external_id,name,parent_external_id")
      .returns<StoreCategoryBase>()
      .single();
    if (error) throw error;
    return toBase(data as StoreCategoryBase);
  },

  // 3. Bulk create
  async bulkCreate(items: CreateCategoryInput[]): Promise<StoreCategory[]> {
    if (!items || items.length === 0) return [];
    const payload = items.map((it) => ({
      supplier_id: castNullableNumber(it.supplier_id),
      external_id: it.external_id,
      name: it.name,
      parent_external_id: it.parent_external_id ?? null,
    }));
    const { data, error } = await supabase
      .from("store_categories")
      .insert(payload)
      .select("external_id,name,parent_external_id")
      .returns<StoreCategoryBase[]>();
    if (error) throw error;
    const rows = data ?? [];
    return rows.map(toBase);
  },

  // 4. Read all categories for supplier (full shape including id)
  async getSupplierCategories(supplierId: string | number): Promise<StoreCategoryFull[]> {
    const { data, error } = await categoriesSelect("id,external_id,name,parent_external_id,supplier_id", supplierId)
      .order("name")
      .returns<StoreCategoryFullRow[]>();
    if (error) throw error;
    const rows = data ?? [];
    return rows.map(toFull);
  },

  // 5. Read subcategories of a specific category
  async getSubcategories(supplierId: string | number, parentExternalId: string): Promise<StoreCategoryFull[]> {
    const normalized = castNullableNumber(supplierId);
    let q = supabase
      .from("store_categories")
      .select("id,external_id,name,parent_external_id,supplier_id")
      .eq("parent_external_id", parentExternalId)
      .order("name");
    if (normalized !== undefined) q = q.eq("supplier_id", normalized);
    const { data, error } = await q.returns<StoreCategoryFullRow[]>();
    if (error) throw error;
    const rows = data ?? [];
    return rows.map(toFull);
  },

  // 6. Read specific category by external_id
  async getByExternalId(supplierId: string | number, externalId: string): Promise<StoreCategoryFull | null> {
    const normalized = castNullableNumber(supplierId);
    let builder = supabase
      .from("store_categories")
      .select("id,external_id,name,parent_external_id,supplier_id")
      .eq("external_id", externalId);
    if (normalized !== undefined) builder = builder.eq("supplier_id", normalized);
    const { data, error } = await builder.returns<StoreCategoryFullRow>().maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return toFull(data as StoreCategoryFullRow);
  },

  // 7. Update category name by external_id and supplier_id
  async updateName(supplierId: string | number, externalId: string, name: string): Promise<StoreCategory> {
    const normalized = castNullableNumber(supplierId);
    if (normalized === undefined) {
      throw new Error("Invalid supplierId");
    }
    const { data, error } = await supabase
      .from("store_categories")
      .update({ name })
      .eq("external_id", externalId)
      .eq("supplier_id", normalized)
      .select("external_id,name,parent_external_id")
      .returns<StoreCategoryBase>()
      .single();
    if (error) throw error;
    return toBase(data as StoreCategoryBase);
  },

  // 8. Delete category by external_id and supplier_id
  async deleteCategory(supplierId: string | number, externalId: string): Promise<boolean> {
    const normalized = castNullableNumber(supplierId);
    if (normalized === undefined) {
      throw new Error("Invalid supplierId");
    }
    const { error } = await supabase
      .from("store_categories")
      .delete()
      .eq("external_id", externalId)
      .eq("supplier_id", normalized);
    if (error) throw error;
    return true;
  },

  // 9. Cascade delete: delete a category and all its descendants for a supplier
  async deleteCategoryCascade(supplierId: string | number, externalId: string): Promise<boolean> {
    const normalized = castNullableNumber(supplierId);
    if (normalized === undefined) {
      throw new Error("Invalid supplierId");
    }
    const { data, error } = await supabase
      .from("store_categories")
      .select("external_id,parent_external_id")
      .eq("supplier_id", normalized)
      .returns<Array<{ external_id: string; parent_external_id: string | null }>>();
    if (error) throw error;
    const rows = data ?? [];
    const toDelete = new Set<string>([externalId]);
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
    const { error: delError } = await supabase
      .from("store_categories")
      .delete()
      .eq("supplier_id", normalized)
      .in("external_id", ids);
    if (delError) throw delError;
    return true;
  },
};
