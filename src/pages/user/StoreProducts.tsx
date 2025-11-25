import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProductsTable } from "@/components/user/products/ProductsTable";
import { ProductService, type Product, type ProductLimitInfo } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ShopService } from "@/lib/shop-service";
import { Loader2, Package, List } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export const StoreProducts = () => {
  const { id } = useParams();
  const storeId = String(id || "");
  const { t } = useI18n();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [shopName, setShopName] = useState("");
  const [tableLoading, setTableLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [limitInfo, setLimitInfo] = useState<ProductLimitInfo>({ current: 0, max: 0, canCreate: false });
  const queryClient = useQueryClient();
  const { data: shopsAgg } = useQuery({ queryKey: ['shopsList'], queryFn: ShopService.getShopsAggregated });
  const aggProducts = (() => {
    const s = (shopsAgg || []).find((row) => String((row as { id: string }).id) === storeId);
    return Number((s as { productsCount?: number } | undefined)?.productsCount ?? 0);
  })();
  const aggCategories = (() => {
    const s = (shopsAgg || []).find((row) => String((row as { id: string }).id) === storeId);
    return Number((s as { categoriesCount?: number } | undefined)?.categoriesCount ?? 0);
  })();

  useEffect(() => {
    if (!storeId) {
      toast.error(t("no_active_stores"));
    }
    (async () => {
      try {
        const shop = await ShopService.getShop(storeId);
        setShopName(shop?.store_name || "");
      } catch (_) {
        setShopName("");
      }
      try {
        const info = await ProductService.getProductLimit();
        setLimitInfo(info);
      } catch (_) { void 0; }
    })();
  }, [storeId, t]);

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
            <Badge variant="outline" className="text-sm flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              <span>{limitInfo.current} / {limitInfo.max}</span>
            </Badge>
            <span className="text-sm text-muted-foreground">Товарів</span>
            <Badge variant="outline" className="px-3 py-1 font-mono">{aggProducts}</Badge>
            <span className="text-sm text-muted-foreground">Категорій</span>
            <Badge variant="outline" className="px-3 py-1 font-mono inline-flex items-center gap-1">
              <List className="h-3 w-3" />
              <span>{aggCategories}</span>
            </Badge>
          </div>
        }
      />
      <div className="relative" aria-busy={tableLoading}>
        {tableLoading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <ProductsTable
          onEdit={handleEdit}
          onDelete={handleDelete}
          onProductsLoaded={(cnt) => setTotalCount(cnt ?? 0)}
          onLoadingChange={setTableLoading}
          refreshTrigger={refreshTrigger}
          canCreate={true}
          storeId={storeId}
          hideDuplicate={true}
        />
      </div>
    </div>
  );
};

export default StoreProducts;
