import { useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProductsTable } from "@/components/user/products/ProductsTable";
import { ProductService, type Product } from "@/lib/product-service";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ShopService } from "@/lib/shop-service";
import { Package, List } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader } from "@/components/LoadingSkeletons";
import { useShopRealtimeSync } from "@/hooks/useShopRealtimeSync";
import { ShopCountsService } from "@/lib/shop-counts";

export const StoreProducts = () => {
  const { id } = useParams();
  const storeId = id ? String(id) : "";
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (storeId) {
      navigate(`/user/shops/${storeId}`, { replace: true });
    }
  }, [storeId, navigate]);

  console.log('=== StoreProducts RENDER ===');
  console.log('storeId:', storeId);

  const { data: counts, refetch: refetchCounts } = useQuery({
    queryKey: ShopCountsService.key(storeId),
    queryFn: async () => {
      console.log('🔵 queryFn START, storeId:', storeId);
      const result = await ShopService.recomputeStoreCounts(storeId);
      console.log('🔵 queryFn RESULT:', result);
      return result;
    },
    enabled: !!storeId,
    staleTime: 60000,
  });

  console.log('counts from useQuery:', counts);
  console.log('totalCount will be:', counts?.productsCount ?? 0);
  console.log('categoriesCount will be:', counts?.categoriesCount ?? 0);

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['shop', storeId],
    queryFn: () => ShopService.getShop(storeId),
    enabled: !!storeId,
    staleTime: 300000,
  });

  useShopRealtimeSync({ shopId: storeId, enabled: !!storeId });

  useEffect(() => {
    if (!storeId) {
      toast.error(t("no_active_stores"));
    }
  }, [storeId, t]);

  const handleEdit = useCallback((product: Product) => {
    navigate(`/user/shops/${storeId}/products/edit/${product.id}`);
  }, [navigate, storeId]);

  const handleDelete = useCallback(async (product: Product) => {
    try {
      const { categoryNamesByStore } = await ProductService.bulkRemoveStoreProductLinks(
        [String(product.id)], 
        [storeId]
      );

      const names = categoryNamesByStore?.[storeId] || [];
      const current = counts || { productsCount: 0, categoriesCount: 0 };
      
      ShopCountsService.set(queryClient, storeId, {
        productsCount: Math.max(0, current.productsCount - 1),
        categoriesCount: names.length,
      });

      await refetchCounts();
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
      queryClient.invalidateQueries({ queryKey: ['shopsAggregated'] });
      
      toast.success(t("product_removed_successfully"));
    } catch {
      toast.error(t("failed_remove_from_store"));
    }
  }, [storeId, counts, queryClient, refetchCounts, t]);

  const handleProductsLoaded = useCallback(
    (count: number) => {
      refetchCounts();
    },
    [refetchCounts]
  );

  const totalCount = counts?.productsCount ?? 0;
  const categoriesCount = counts?.categoriesCount ?? 0;
  const shopName = shop?.store_name || "";

  return null;
};

export default StoreProducts;
