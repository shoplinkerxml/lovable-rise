import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProductsTable } from "@/components/user/products/ProductsTable";
import { ProductService, type Product } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ShopService } from "@/lib/shop-service";

export const StoreProducts = () => {
  const { id } = useParams();
  const storeId = String(id || "");
  const { t } = useI18n();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [shopName, setShopName] = useState("");

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
      />
      <ProductsTable
        onEdit={handleEdit}
        onDelete={handleDelete}
        onProductsLoaded={() => {}}
        onLoadingChange={() => {}}
        refreshTrigger={refreshTrigger}
        canCreate={true}
        storeId={storeId}
        hideDuplicate={true}
      />
    </div>
  );
};

export default StoreProducts;
