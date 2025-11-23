import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ProductService, type Product } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ProductFormTabs } from "@/components/ProductFormTabs";
import { type ProductParam, type ProductImage } from "@/lib/product-service";
import { PageHeader } from "@/components/PageHeader";
import { Loader2 } from "lucide-react";
import { ShopService } from "@/lib/shop-service";
import { CategoryService } from "@/lib/category-service";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
};

export const StoreProductEdit = () => {
  const { id, productId } = useParams();
  const storeId = String(id || "");
  const pid = String(productId || "");
  const { t } = useI18n();
  const navigate = useNavigate();
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
  const [images, setImages] = useState<ProductImage[]>([]);
  const [params, setParams] = useState<ProductParam[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(false);
  const [lastCategoryId, setLastCategoryId] = useState<string | null>(null);
  const [storeCategories, setStoreCategories] = useState<Array<{ store_category_id: number; category_id: number; name: string; store_external_id: string | null; is_active: boolean }>>([]);
  const [selectedStoreCategoryId, setSelectedStoreCategoryId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [productRes, linkRes, imagesRes, paramsRes, shopRes] = await Promise.allSettled([
        ProductService.getProductById(pid),
        ProductService.getStoreProductLink(pid, storeId),
        ProductService.getProductImages(pid),
        ProductService.getProductParams(pid),
        ShopService.getShop(storeId),
      ]);

      if (productRes.status === "fulfilled") {
        setBaseProduct(productRes.value);
      } else {
        setBaseProduct(null);
      }

      if (linkRes.status === "fulfilled") {
        type StoreProductLinkDb = {
          is_active?: boolean;
          custom_price?: string | number | null;
          custom_price_old?: string | number | null;
          custom_price_promo?: string | number | null;
          custom_stock_quantity?: string | number | null;
          custom_available?: boolean | null;
        };
        const link = linkRes.value as StoreProductLinkDb | null;
        if (link) {
          setForm({
            is_active: !!link.is_active,
            custom_price: link.custom_price == null ? "" : String(link.custom_price),
            custom_price_old: link.custom_price_old == null ? "" : String(link.custom_price_old),
            custom_price_promo: link.custom_price_promo == null ? "" : String(link.custom_price_promo),
            custom_stock_quantity: link.custom_stock_quantity == null ? "" : String(link.custom_stock_quantity),
            custom_available: link.custom_available == null ? (productRes.status === "fulfilled" ? !!productRes.value?.available : true) : !!link.custom_available,
          });
        }
      } else {
        toast.error(t("failed_load_products"));
      }

      if (imagesRes.status === "fulfilled") {
        setImages(imagesRes.value || []);
      } else {
        setImages([]);
      }

      if (paramsRes.status === "fulfilled") {
        setParams(paramsRes.value || []);
      } else {
        setParams([]);
      }

      if (shopRes.status === "fulfilled") {
        const shop: any = shopRes.value;
        setShopName(shop?.store_name || "");
      } else {
        setShopName("");
      }

      setLoading(false);
    })();
  }, [pid, storeId, t]);

  useEffect(() => {
    (async () => {
      try {
        const rows = await ShopService.getStoreCategories(storeId);
        setStoreCategories(rows.map(r => ({
          store_category_id: r.store_category_id,
          category_id: r.category_id,
          name: r.name,
          store_external_id: r.store_external_id ?? null,
          is_active: r.is_active,
        })));
      } catch (_) {
        setStoreCategories([]);
      }
    })();
  }, [storeId]);

  useEffect(() => {
    const loadCategoryName = async () => {
      if (!baseProduct) return;
      try {
        if (baseProduct.category_id) {
          const cat = await CategoryService.getById(baseProduct.category_id);
          setCategoryName(cat?.name || "");
          return;
        }
        if (baseProduct.supplier_id && baseProduct.category_external_id) {
          const cat = await CategoryService.getByExternalId(String(baseProduct.supplier_id), baseProduct.category_external_id);
          setCategoryName(cat?.name || "");
        }
      } catch (_) {
        setCategoryName("");
      }
    };
    loadCategoryName();
  }, [baseProduct]);

  const updateField = <K extends keyof StoreProductLinkForm>(key: K, value: StoreProductLinkForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (params && params.length >= 0) {
        await ProductService.updateProduct(pid, { params });
      }
      const patch: StoreProductLinkPatch = {
        is_active: !!form.is_active,
        custom_price: null,
        custom_price_old: null,
        custom_price_promo: null,
        custom_stock_quantity: null,
        custom_available: form.custom_available ? true : false,
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

      await ProductService.updateStoreProductLink(pid, storeId, patch);
      if (lastCategoryId) {
        const num = Number(lastCategoryId);
        if (Number.isFinite(num)) {
          try {
            const storeExtId = await ShopService.getStoreCategoryExternalId(storeId, num);
            await ProductService.updateStoreProductLink(pid, storeId, { custom_category_id: storeExtId ?? null });
            ProductService.patchProductCaches(pid, { category_id: num, category_external_id: storeExtId || null }, storeId);
          } catch (_) {
            // ignore
          }
        }
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
            className="text-sm text-muted-foreground"
            data-testid="store_product_edit_back"
          >
            {t("back_to_products")}
          </Link>
        </div>
        <div className="relative min-h-[clamp(12rem,50vh,24rem)]" aria-busy={loading}>
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm" data-testid="store_product_edit_loader">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!loading && (
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
                  onChange={async (partial) => {
                    if (typeof partial.price === "number") updateField("custom_price", String(partial.price));
                    if (typeof partial.price_old === "number") updateField("custom_price_old", String(partial.price_old));
                    if (typeof partial.price_promo === "number") updateField("custom_price_promo", String(partial.price_promo));
                    if (typeof partial.stock_quantity === "number") updateField("custom_stock_quantity", String(partial.stock_quantity));
                    if (typeof partial.available === "boolean") {
                      updateField("custom_available", partial.available);
                      try {
                        await ProductService.updateStoreProductLink(pid, storeId, { custom_available: partial.available });
                      } catch (_) {
                        toast.error(t("operation_failed"));
                      }
                    }
                    if (typeof partial.category_id === "string" && partial.category_id.trim()) {
                      const cid = partial.category_id.trim();
                      if (cid !== lastCategoryId) {
                        setLastCategoryId(cid);
                        if (partial.category_name) setCategoryName(partial.category_name);
                        const num = Number(cid);
                        if (Number.isFinite(num)) {
                          const prevNum = baseProduct?.category_id ?? null;
                          try {
                            await ProductService.updateProduct(pid, { category_id: num });
                            setBaseProduct((prev) => prev ? { ...prev, category_id: num } : prev);
                            await ShopService.ensureStoreCategory(storeId, num, { external_id: partial.category_external_id || null });
                            const storeExtId = await ShopService.getStoreCategoryExternalId(storeId, num);
                            await ProductService.updateStoreProductLink(pid, storeId, { custom_category_id: storeExtId ?? null });
                            ProductService.patchProductCaches(pid, { category_id: num, category_external_id: partial.category_external_id || null, categoryName: partial.category_name || undefined }, storeId);
                            if (prevNum && Number.isFinite(prevNum) && prevNum !== num) {
                              await ShopService.cleanupUnusedStoreCategory(storeId, prevNum);
                            }
                          } catch (_) {
                            toast.error(t("failed_save_category"));
                          }
                        }
                      }
                    }
                  }}
                  forceParamsEditable
                  onParamsChange={(p) => setParams(p)}
                  onImagesLoadingChange={setImagesLoading}
                />
              ) : null}

              <div className="space-y-3">
                <div className="grid gap-2">
                  <div className="space-y-1">
                    <Label>Категория магазина</Label>
                    <Select
                      value={selectedStoreCategoryId != null ? String(selectedStoreCategoryId) : undefined}
                      onValueChange={async (val) => {
                        const idNum = Number(val);
                        setSelectedStoreCategoryId(Number.isFinite(idNum) ? idNum : null);
                        const sc = storeCategories.find(c => c.store_category_id === idNum);
                        const extId = sc?.store_external_id ?? null;
                        try {
                          await ProductService.updateStoreProductLink(pid, storeId, { custom_category_id: extId });
                          if (!extId) {
                            toast.error(t('validation_error'));
                          } else {
                            toast.success(t('product_updated'));
                          }
                        } catch (_) {
                          toast.error(t('failed_save_category'));
                        }
                      }}
                    >
                      <SelectTrigger className="w-full max-w-sm">
                        <SelectValue placeholder={"Выберите категорию магазина"} />
                      </SelectTrigger>
                      <SelectContent>
                        {storeCategories.map((c) => (
                          <SelectItem key={c.store_category_id} value={String(c.store_category_id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">Сохраняется external_id категории магазина для экспорта</div>
                    {(() => {
                      const sc = selectedStoreCategoryId ? storeCategories.find(c => c.store_category_id === selectedStoreCategoryId) : null;
                      if (sc && !sc.store_external_id) {
                        return (
                          <Alert variant="destructive" className="mt-2">
                            <AlertDescription>
                              У выбранной категории отсутствует external_id. Заполните его в списке категорий магазина, иначе экспорт будет невозможен.
                            </AlertDescription>
                          </Alert>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => navigate(-1)}>{t("cancel")}</Button>
                  <Button onClick={handleSave} disabled={saving} aria-disabled={saving}>{t("save_changes")}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StoreProductEdit;
