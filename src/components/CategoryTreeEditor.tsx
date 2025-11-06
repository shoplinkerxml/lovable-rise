import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useI18n } from "@/providers/i18n-provider";
import { CategoryService, type StoreCategory } from "@/lib/category-service";

type Supplier = { id: string; supplier_name: string };
type Store = { id: string; store_name: string };

interface CategoryTreeEditorProps {
  suppliers: Supplier[];
  stores: Store[];
  categories: StoreCategory[];
  defaultSupplierId?: string;
  defaultStoreId?: string;
  onCategoryCreated?: (category: StoreCategory) => void;
  showStoreSelect?: boolean;
}

export const CategoryTreeEditor: React.FC<CategoryTreeEditorProps> = ({
  suppliers,
  stores,
  categories,
  defaultSupplierId,
  defaultStoreId,
  onCategoryCreated,
  showStoreSelect = true,
}) => {
  const { t } = useI18n();

  const [supplierId, setSupplierId] = useState<string>(defaultSupplierId || "");
  const [storeId, setStoreId] = useState<string>(defaultStoreId || "");
  const [parentExternalId, setParentExternalId] = useState<string>("");
  const [externalId, setExternalId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!supplierId) {
      toast.error(t("select_supplier_error") || "Оберіть постачальника");
      return;
    }
    if (!externalId.trim() || !name.trim()) {
      toast.error(t("fill_required_fields") || "Заповніть обов'язкові поля");
      return;
    }
    try {
      setCreating(true);
      const newCat = await CategoryService.createCategory({
        supplier_id: supplierId,
        store_id: storeId || undefined,
        external_id: externalId.trim(),
        name: name.trim(),
        parent_external_id: parentExternalId || undefined,
      });
      toast.success(t("category_created"));
      onCategoryCreated?.(newCat);
      setParentExternalId("");
      setExternalId("");
      setName("");
    } catch (error: any) {
      console.error("Create category error:", error);
      toast.error(t("failed_create_category"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card data-testid="categoryTreeEditor_card">
      <CardHeader>
        <CardTitle className="text-base" data-testid="categoryTreeEditor_title">{t("category_editor_title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cte_supplier">{t("supplier")}</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="cte_supplier" data-testid="categoryTreeEditor_supplierSelect">
                <SelectValue placeholder={t("select_supplier")} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.supplier_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showStoreSelect && (
            <div className="space-y-2">
              <Label htmlFor="cte_store">{t("store")}</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger id="cte_store" data-testid="categoryTreeEditor_storeSelect">
                  <SelectValue placeholder={t("select_store")} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.store_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cte_parent">{t("parent_category")}</Label>
            <Select value={parentExternalId} onValueChange={setParentExternalId}>
              <SelectTrigger id="cte_parent" data-testid="categoryTreeEditor_parentSelect">
                <SelectValue placeholder={t("select_parent_category")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={(cat as any).external_id || ""}>
                    {(cat as any).name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cte_external">{t("external_id")}</Label>
            <Input
              id="cte_external"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder={t("external_id_placeholder")}
              data-testid="categoryTreeEditor_externalIdInput"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cte_name">{t("category_name")}</Label>
          <Input
            id="cte_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("category_name_placeholder")}
            data-testid="categoryTreeEditor_nameInput"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={creating || !externalId.trim() || !name.trim() || !supplierId} data-testid="categoryTreeEditor_createButton">
            {creating ? t("loading_creating") : t("create_category")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryTreeEditor;