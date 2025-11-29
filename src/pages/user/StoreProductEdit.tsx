import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ProductService, type Product } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ProductFormTabs } from "@/components/ProductFormTabs";
import { type ProductParam } from "@/lib/product-service";
import { PageHeader } from "@/components/PageHeader";
import { Loader2, ArrowLeft } from "lucide-react";
import { ShopService, type Shop } from "@/lib/shop-service";
import { CategoryService } from "@/lib/category-service";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ContentSkeleton, ProgressiveLoader } from "@/components/LoadingSkeletons";

type StoreProductLinkForm = {
  is_active: boolean;
  custom_price: string;
  custom_price_old: string;
  custom_price_promo: string;
  custom_stock_quantity: string;
  custom_available: boolean;
};

type StoreProductLinkPatch = {
  is_active: boolean;
  custom_price: number | null;
  custom_price_old: number | null;
  custom_price_promo: number | null;
  custom_stock_quantity: number | null;
  custom_available: boolean | null;
  custom_category_id: string | null;
};

export const StoreProductEdit = () => {
  const { id, productId } = useParams();
  const storeId = String(id || "");
  const pid = String(productId || "");
  const { t } = useI18n();
  const showFailToast = useCallback(() => toast.error(t('failed_load_products')), [t]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shopName, setShopName] = useState("");
  const [categoryName, setCategoryName] = useState("");

  const [form, setForm] = useState<StoreProductLinkForm>({
    is_active: true,
    custom_price: "",
    custom_price_old: "",
    custom_price_promo: "",
    custom_stock_quantity: "",
    custom_available: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseProduct, setBaseProduct] = useState<Product | null>(null);
  type FormImage = { id?: string; url: string; order_index: number; is_main: boolean; alt_text?: string };
  const [images, setImages] = useState<FormImage[]>([]);
  const [params, setParams] = useState<ProductParam[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(false);
  const [lastCategoryId, setLastCategoryId] = useState<string | null>(null);
  const [storeCategories, setStoreCategories] = useState<Array<{ store_category_id: number; category_id: number; name: string; store_external_id: string | null; is_active: boolean }>>([]);
  const [selectedStoreCategoryId, setSelectedStoreCategoryId] = useState<number | null>(null);
  const aggSuppliersRef = useRef<Array<{ id: string; supplier_name: string }> | undefined>(undefined);
  const aggCurrenciesRef = useRef<Array<{ id: number; name: string; code: string; status: boolean | null }> | undefined>(undefined);
  const aggCategoriesRef = useRef<Array<{ id: string; name: string; external_id: string; supplier_id: string; parent_external_id: string | null }> | undefined>(undefined);
  const aggSupplierCategoriesMapRef = useRef<Record<string, Array<{ id: string; name: string; external_id: string; supplier_id: string; parent_external_id: string | null }>> | undefined>(undefined);

  const firstLoadRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${pid}:${storeId}`;
    if (firstLoadRef.current === key) return;
    firstLoadRef.current = key;
    (async () => {
      setLoading(true);
      try {
        const agg = await ProductService.getProductEditData(pid, storeId);
        setBaseProduct(agg.product);
        if (agg.link) {
          const link = agg.link as {
            is_active?: boolean;
            custom_price?: string | number | null;
            custom_price_old?: string | number | null;
            custom_price_promo?: string | number | null;
            custom_stock_quantity?: string | number | null;
            custom_available?: boolean | null;
          };
          setForm({
            is_active: !!link.is_active,
            custom_price: link.custom_price == null ? "" : String(link.custom_price),
            custom_price_old: link.custom_price_old == null ? "" : String(link.custom_price_old),
            custom_price_promo: link.custom_price_promo == null ? "" : String(link.custom_price_promo),
            custom_stock_quantity: link.custom_stock_quantity == null ? "" : String(link.custom_stock_quantity),
            custom_available: link.custom_available == null ? (agg.product ? !!agg.product.available : true) : !!link.custom_available,
          });
        }
        const srcImages = (agg.images || []) as Array<{ id?: string; url: string; order_index: number; is_main?: boolean; alt_text?: string | null }>;
        setImages(srcImages.map((img, index) => ({
          id: img.id ? String(img.id) : undefined,
          url: String(img.url || ''),
          order_index: typeof img.order_index === 'number' ? img.order_index : index,
          is_main: !!img.is_main,
          alt_text: img.alt_text ?? undefined,
        })));
        setParams(agg.params || []);
        setShopName(agg.shop?.store_name || "");
        if (agg.categoryName) setCategoryName(agg.categoryName);
        aggSuppliersRef.current = agg.suppliers;
        aggCurrenciesRef.current = agg.currencies;
        aggCategoriesRef.current = agg.categories;
        aggSupplierCategoriesMapRef.current = agg.supplierCategoriesMap;
        if (Array.isArray(agg.storeCategories)) {
          setStoreCategories(agg.storeCategories.map(r => ({
            store_category_id: r.store_category_id,
            category_id: r.category_id,
            name: r.name,
            store_external_id: r.store_external_id,
            is_active: r.is_active,
          })));
        }
      } catch (_) {
        showFailToast();
      } finally {
        setLoading(false);
      }
    })();
  }, [pid, storeId, showFailToast]);

  // storeCategories получаем из функции product-edit-data; не выполняем прямые запросы

  // categoryName приходит из product-edit-data; дублирующие запросы убраны

  const updateField = <K extends keyof StoreProductLinkForm>(key: K, value: StoreProductLinkForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const productPayload: { params?: ProductParam[]; category_id?: number } = {};
      if (params && params.length >= 0) {
        productPayload.params = params;
      }
      const patch: StoreProductLinkPatch = {
        is_active: !!form.is_active,
        custom_price: null,
        custom_price_old: null,
        custom_price_promo: null,
        custom_stock_quantity: null,
        custom_available: form.custom_available ? true : false,
        custom_category_id: null,
      };

      const priceStr = form.custom_price.trim();
      const priceNum = Number(priceStr);
      patch.custom_price = priceStr ? (Number.isFinite(priceNum) ? priceNum : null) : null;

      const priceOldStr = form.custom_price_old.trim();
      const priceOldNum = Number(priceOldStr);
      patch.custom_price_old = priceOldStr ? (Number.isFinite(priceOldNum) ? priceOldNum : null) : null;

      const promoStr = form.custom_price_promo.trim();
      const promoNum = Number(promoStr);
      patch.custom_price_promo = promoStr ? (Number.isFinite(promoNum) ? promoNum : null) : null;

      const stockStr = form.custom_stock_quantity.trim();
      const stockNum = Number(stockStr);
      patch.custom_stock_quantity = stockStr ? (Number.isFinite(stockNum) ? stockNum : null) : null;

      let freshName: string | undefined = undefined;
      if (lastCategoryId) {
        const num = Number(lastCategoryId);
        if (Number.isFinite(num)) {
          productPayload.category_id = num;
          const storeExtId = (() => {
            const row = storeCategories.find((r) => r.category_id === num);
            return row?.store_external_id ?? null;
          })();
          patch.custom_category_id = storeExtId ?? null;
          freshName = (() => {
            const fromStore = storeCategories.find((r) => r.category_id === num)?.name || '';
            if (fromStore) return fromStore;
            const cats = (aggCategoriesRef.current || []) as Array<{ id: string | number; name: string }>;
            const found = cats.find((c) => String(c.id) === String(num));
            return found?.name || '';
          })();
        }
      }

      await ProductService.saveStoreProductEdit(pid, storeId, { ...productPayload, linkPatch: patch });
      if (productPayload.category_id != null) {
        const num = Number(productPayload.category_id);
        const storeExtId = String(patch.custom_category_id || "") || null;
        ProductService.patchProductCaches(pid, { category_id: num, category_external_id: storeExtId || null, categoryName: freshName || undefined }, storeId);
      }
      toast.success(t("product_updated"));
      navigate(`/user/shops/${storeId}/products`);
    } catch (e) {
      toast.error(t("failed_save_product"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("edit_product")}
        description={t("edit_product_description")}
        breadcrumbItems={[
          { label: t("breadcrumb_home"), href: "/user/dashboard" },
          { label: t("shops_title"), href: "/user/shops" },
          { label: shopName || storeId, href: `/user/shops/${storeId}` },
          { label: t("products_title"), href: `/user/shops/${storeId}/products` },
          { label: categoryName || "—", current: true },
        ]}
      />
      <Card className="p-6 space-y-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-lg">{t("edit_product")}</div>
          <Link
            to={`/user/shops/${storeId}/products`}
            className="text-muted-foreground inline-flex items-center gap-1.5"
            data-testid="store_product_edit_back"
            aria-label={t("back_to_products")}
          >
            <ArrowLeft className="h-4 w-4 text-foreground hover:text-emerald-600" />
          </Link>
        </div>
        <ProgressiveLoader isLoading={loading} fallback={<ContentSkeleton type="product-edit" />} delay={100}>
          <div className="space-y-6">
            {baseProduct ? (
              <ProductFormTabs
                product={baseProduct}
                readOnly
                editableKeys={["price", "price_old", "price_promo", "stock_quantity", "available"]}
                overrides={{
                  price: form.custom_price ? parseFloat(form.custom_price) || 0 : baseProduct.price || 0,
                  price_old: form.custom_price_old ? parseFloat(form.custom_price_old) || 0 : baseProduct.price_old || 0,
                  price_promo: form.custom_price_promo ? parseFloat(form.custom_price_promo) || 0 : baseProduct.price_promo || 0,
                  stock_quantity: form.custom_stock_quantity ? parseInt(form.custom_stock_quantity) || 0 : baseProduct.stock_quantity || 0,
                }}
                preloadedImages={images}
                preloadedParams={params}
                preloadedSuppliers={aggSuppliersRef.current}
                preloadedCurrencies={aggCurrenciesRef.current}
                preloadedCategories={aggCategoriesRef.current}
                preloadedSupplierCategoriesMap={Object.fromEntries(Object.entries(aggSupplierCategoriesMapRef.current || {}).map(([key, arr]) => [key, (arr || []).map((c) => ({ id: String(c.id), name: String(c.name || ''), external_id: String(c.external_id || ''), supplier_id: String(c.supplier_id || ''), parent_external_id: c.parent_external_id == null ? null : String(c.parent_external_id) }))]))}
                onChange={async (partial) => {
                  if (typeof partial.price === "number") updateField("custom_price", String(partial.price));
                  if (typeof partial.price_old === "number") updateField("custom_price_old", String(partial.price_old));
                  if (typeof partial.price_promo === "number") updateField("custom_price_promo", String(partial.price_promo));
                  if (typeof partial.stock_quantity === "number") updateField("custom_stock_quantity", String(partial.stock_quantity));
                  if (typeof partial.available === "boolean") {
                    updateField("custom_available", partial.available);
                  }
                  if (typeof partial.category_id === "string" && partial.category_id.trim()) {
                    const cid = partial.category_id.trim();
                    if (cid !== lastCategoryId) {
                      setLastCategoryId(cid);
                      if (partial.category_name) setCategoryName(partial.category_name);
                    }
                  }
                }}
                forceParamsEditable
                onParamsChange={(p) => setParams(p)}
                onImagesLoadingChange={setImagesLoading}
              />
            ) : null}

            <div className="space-y-3">
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => navigate(-1)}>{t("cancel")}</Button>
                <Button onClick={handleSave} disabled={saving} aria-disabled={saving}>{t("save_changes")}</Button>
              </div>
            </div>
          </div>
        </ProgressiveLoader>
      </Card>
    </div>
  );
};

export default StoreProductEdit;
