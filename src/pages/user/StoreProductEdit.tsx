import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ProductService, type Product } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ProductFormTabs } from "@/components/ProductFormTabs";

type StoreProductLinkForm = {
  is_active: boolean;
  custom_name: string;
  custom_description: string;
  custom_price: string;
  custom_price_promo: string;
  custom_stock_quantity: string;
};

type StoreProductLinkPatch = {
  is_active: boolean;
  custom_name: string | null;
  custom_description: string | null;
  custom_price: number | null;
  custom_price_promo: number | null;
  custom_stock_quantity: number | null;
};

export const StoreProductEdit = () => {
  const { id, productId } = useParams();
  const storeId = String(id || "");
  const pid = String(productId || "");
  const { t } = useI18n();
  const navigate = useNavigate();

  const [form, setForm] = useState<StoreProductLinkForm>({
    is_active: true,
    custom_name: "",
    custom_description: "",
    custom_price: "",
    custom_price_promo: "",
    custom_stock_quantity: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseProduct, setBaseProduct] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [productRes, linkRes] = await Promise.allSettled([
        ProductService.getProductById(pid),
        ProductService.getStoreProductLink(pid, storeId),
      ]);

      if (productRes.status === "fulfilled") {
        setBaseProduct(productRes.value);
      } else {
        setBaseProduct(null);
      }

      if (linkRes.status === "fulfilled") {
        type StoreProductLinkDb = {
          is_active?: boolean;
          custom_name?: string | null;
          custom_description?: string | null;
          custom_price?: string | number | null;
          custom_price_promo?: string | number | null;
          custom_stock_quantity?: string | number | null;
        };
        const link = linkRes.value as StoreProductLinkDb | null;
        if (link) {
          setForm({
            is_active: !!link.is_active,
            custom_name: link.custom_name ?? "",
            custom_description: link.custom_description ?? "",
            custom_price: link.custom_price == null ? "" : String(link.custom_price),
            custom_price_promo: link.custom_price_promo == null ? "" : String(link.custom_price_promo),
            custom_stock_quantity: link.custom_stock_quantity == null ? "" : String(link.custom_stock_quantity),
          });
        }
      } else {
        toast.error(t("failed_load_products"));
      }

      setLoading(false);
    })();
  }, [pid, storeId, t]);

  const updateField = <K extends keyof StoreProductLinkForm>(key: K, value: StoreProductLinkForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: StoreProductLinkPatch = {
        is_active: !!form.is_active,
        custom_name: null,
        custom_description: null,
        custom_price: null,
        custom_price_promo: null,
        custom_stock_quantity: null,
      };

      const name = form.custom_name.trim();
      patch.custom_name = name ? name : null;

      const desc = form.custom_description.trim();
      patch.custom_description = desc ? desc : null;

      const priceStr = form.custom_price.trim();
      const priceNum = Number(priceStr);
      patch.custom_price = priceStr ? (Number.isFinite(priceNum) ? priceNum : null) : null;

      const promoStr = form.custom_price_promo.trim();
      const promoNum = Number(promoStr);
      patch.custom_price_promo = promoStr ? (Number.isFinite(promoNum) ? promoNum : null) : null;

      const stockStr = form.custom_stock_quantity.trim();
      const stockNum = Number(stockStr);
      patch.custom_stock_quantity = stockStr ? (Number.isFinite(stockNum) ? stockNum : null) : null;

      await ProductService.updateStoreProductLink(pid, storeId, patch);
      toast.success(t("product_updated"));
      navigate(`/user/shops/${storeId}/products`);
    } catch (e) {
      toast.error(t("failed_save_product"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl">
      <div className="mb-4">
        <Link to={`/user/shops/${storeId}/products`} className="text-sm text-muted-foreground">{t("back_to_products")}</Link>
      </div>
      <Card className="p-4 space-y-6">
        <div className="text-lg mb-2">{t("edit_product")}</div>
        {loading ? (
          <div className="text-sm">{t("loading")}</div>
        ) : (
          <div className="space-y-6">
            {/* Full product card (read-only) with tabs */}
            {baseProduct ? (
              <div aria-disabled className="pointer-events-none opacity-90">
                <ProductFormTabs product={baseProduct} />
              </div>
            ) : null}

            {/* Store-specific editable fields */}
            <div className="space-y-3">
              <div>
                <Checkbox
                  checked={!!form.is_active}
                  onCheckedChange={(v) => updateField("is_active", !!v)}
                  aria-label={t("status")}
                />
                <span className="ml-2 text-sm">{t("table_status")}</span>
              </div>
              <div>
                <label className="text-sm">{t("product_name")}</label>
                <Input value={form.custom_name} onChange={(e) => updateField("custom_name", e.target.value)} />
              </div>
              <div>
                <label className="text-sm">{t("product_description_ua")}</label>
                <Textarea value={form.custom_description} onChange={(e) => updateField("custom_description", e.target.value)} />
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm">{t("table_price")}</label>
                <Input type="number" value={form.custom_price} onChange={(e) => updateField("custom_price", e.target.value)} />
              </div>
              <div>
                <label className="text-sm">{t("promo_price")}</label>
                <Input type="number" value={form.custom_price_promo} onChange={(e) => updateField("custom_price_promo", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">{t("table_stock")}</label>
                <Input type="number" value={form.custom_stock_quantity} onChange={(e) => updateField("custom_stock_quantity", e.target.value)} />
              </div>
            </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>{t("cancel")}</Button>
                <Button onClick={handleSave} disabled={saving} aria-disabled={saving}>{t("save_changes")}</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StoreProductEdit;
