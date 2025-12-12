import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProductsTable } from "@/components/user/products/ProductsTable";
import { ProductService, type Product } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ShopService } from "@/lib/shop-service";
import { Loader2, Package, List, Store as StoreIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ProgressiveLoader, FullPageLoader } from "@/components/LoadingSkeletons";
 

export const StoreProducts = () => {
  const { id } = useParams();
  const storeId = String(id || "");
  const { t } = useI18n();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [shopName, setShopName] = useState("");
  const [tableLoading, setTableLoading] = useState<boolean>(true);
  const [initialReady, setInitialReady] = useState<boolean>(false);
  const [shopLoaded, setShopLoaded] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [limitInfo] = useState<{ current: number; max: number; canCreate: boolean }>({ current: 0, max: 0, canCreate: true });
  const queryClient = useQueryClient();
  const [categoriesCount, setCategoriesCount] = useState<number>(0);

  useEffect(() => {
    if (!storeId) {
      toast.error(t("no_active_stores"));
    }
    (async () => {
      try {
        const shop = await ShopService.getShop(storeId);
        setShopName(shop?.store_name || "");
      } catch (_) { setShopName(""); }
      finally { setShopLoaded(true); }
    })();
  }, [storeId, t]);

  useEffect(() => {
    (async () => {
      try {
        const names = await ProductService.getStoreCategoryFilterOptions(storeId);
        setCategoriesCount(Array.isArray(names) ? names.length : 0);
      } catch {
        try {
          const key = `rq:filters:categories:${storeId}`;
          const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
          if (raw) {
            const parsed = JSON.parse(raw) as { items?: string[] } | string[];
            const cnt = Array.isArray((parsed as { items?: string[] }).items)
              ? ((parsed as { items?: string[] }).items as string[]).length
              : (Array.isArray(parsed) ? (parsed as string[]).length : 0);
            setCategoriesCount(cnt);
          }
        } catch { void 0; }
      }
    })();
  }, [storeId]);

  const handleEdit = (product: Product) => {
    navigate(`/user/shops/${storeId}/products/edit/${product.id}`);
  };

  const handleDelete = async (product: Product) => {
    try {
      await ProductService.updateStoreProductLink(product.id, storeId, { is_active: false });
      await ProductService.removeStoreProductLink(product.id, storeId);
      setRefreshTrigger((p) => p + 1);
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
      try { ShopService.bumpProductsCountInCache(storeId, -1); } catch (e) { void e; }
    } catch (_) {
      toast.error(t("failed_remove_from_store"));
    }
  };

  return (
    <ProgressiveLoader
      isLoading={!shopLoaded}
      delay={200}
      fallback={
        <FullPageLoader
          title="Завантаження товарів…"
          subtitle="Готуємо таблицю та фільтри магазину"
          icon={Package}
        />
      }
    >
    <div className="p-6 space-y-6">
      <PageHeader
        title={t("products_title")}
        description={t("products_description")}
        breadcrumbItems={[
          { label: t("breadcrumb_home"), href: "/user/dashboard" },
          { label: t("shops_title"), href: "/user/shops" },
          { label: shopName || storeId, href: `/user/shops/${storeId}` },
          { label: t("products_title"), current: true },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 font-mono inline-flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span>{totalCount}</span>
            </Badge>
            <Badge variant="outline" className="px-3 py-1 font-mono inline-flex items-center gap-1">
              <List className="h-3 w-3" />
              <span>{categoriesCount}</span>
            </Badge>
          </div>
        }
      />
      <div className="relative">
        <ProductsTable
          onEdit={handleEdit}
          onDelete={handleDelete}
          onProductsLoaded={(cnt) => setTotalCount(cnt ?? 0)}
          onLoadingChange={(loading) => {
            setTableLoading(loading);
            if (!loading && !initialReady) setInitialReady(true);
          }}
          refreshTrigger={refreshTrigger}
          canCreate={true}
          storeId={storeId}
          hideDuplicate={true}
        />
      </div>
    </div>
    </ProgressiveLoader>
  );
};

export default StoreProducts;
