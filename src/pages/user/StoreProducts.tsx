import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProductsTable } from "@/components/user/products/ProductsTable";
import { ProductService, type Product } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const StoreProducts = () => {
  const { id } = useParams();
  const storeId = String(id || "");
  const { t } = useI18n();
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!storeId) {
      toast.error(t("no_active_stores"));
    }
  }, [storeId]);

  const handleEdit = (product: Product) => {
    navigate(`/user/shops/${storeId}/products/edit/${product.id}`);
  };

  const handleDelete = async (product: Product) => {
    try {
      await (ProductService as any).updateStoreProductLink(product.id, storeId, { is_active: false });
      // Альтернативно: удалить связь
      await (supabase as any)
        .from('store_product_links')
        .delete()
        .eq('product_id', product.id)
        .eq('store_id', storeId);
      setRefreshTrigger((p) => p + 1);
    } catch (_) {
      toast.error(t("failed_remove_from_store"));
    }
  };

  return (
    <div className="p-4">
      <ProductsTable
        onEdit={handleEdit}
        onDelete={handleDelete}
        onProductsLoaded={() => {}}
        onLoadingChange={() => {}}
        refreshTrigger={refreshTrigger}
        canCreate={true}
        storeId={storeId}
      />
    </div>
  );
};

export default StoreProducts;
