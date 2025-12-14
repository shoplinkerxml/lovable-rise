import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShopService } from "@/lib/shop-service";
import { ProductService } from "@/lib/product-service";
import type { ShopAggregated } from "@/lib/shop-service";
import type {
  PostgresInsertPayload,
  PostgresUpdatePayload,
  PostgresDeletePayload,
  ShopCounts,
} from "@/types/shop";

interface UseShopRealtimeSyncOptions {
  shopId: string;
  enabled?: boolean;
}

export const useShopRealtimeSync = ({ shopId, enabled = true }: UseShopRealtimeSyncOptions) => {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !shopId) return;
    isMountedRef.current = true;

    const scheduleCountsRefetch = () => {
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(async () => {
        if (!isMountedRef.current) return;
        try {
          const [productsCount, categoryNames] = await Promise.all([
            ShopService.getStoreProductsCount(shopId),
            ProductService.getStoreCategoryFilterOptions(shopId),
          ]);
          if (!isMountedRef.current) return;
          const categoriesCount = Array.isArray(categoryNames) ? categoryNames.length : 0;
          queryClient.setQueryData<ShopCounts>(["shopCounts", shopId], {
            productsCount,
            categoriesCount,
          });
          queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((s) =>
              String(s.id) === shopId ? { ...s, productsCount, categoriesCount } : s
            );
          });
        } catch (error) {
          if (isMountedRef.current) {
            queryClient.invalidateQueries({ queryKey: ["shopCounts", shopId] });
          }
        }
      }, 500);
    };

    const updateProductCount = (delta: number) => {
      queryClient.setQueryData<ShopCounts>(["shopCounts", shopId], (old) => {
        if (!old) return { productsCount: Math.max(0, delta), categoriesCount: 0 };
        return {
          productsCount: Math.max(0, old.productsCount + delta),
          categoriesCount: old.categoriesCount,
        };
      });
      queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((s) =>
          String(s.id) === shopId
            ? { ...s, productsCount: Math.max(0, (s.productsCount ?? 0) + delta) }
            : s
        );
      });
      scheduleCountsRefetch();
    };

    const handleInsert = (payload: PostgresInsertPayload) => {
      const { store_id, is_active } = payload.new;
      if (String(store_id) === shopId && is_active !== false) {
        updateProductCount(+1);
      }
    };

    const handleDelete = (payload: PostgresDeletePayload) => {
      const { store_id, is_active } = payload.old;
      if (String(store_id) === shopId && is_active !== false) {
        updateProductCount(-1);
      }
    };

    const handleUpdate = (payload: PostgresUpdatePayload) => {
      const { store_id: oldStoreId, is_active: wasActive } = payload.old;
      const { store_id: newStoreId, is_active: isActive } = payload.new;
      if (oldStoreId !== newStoreId) {
        if (String(oldStoreId) === shopId && wasActive !== false) {
          updateProductCount(-1);
        }
        if (String(newStoreId) === shopId && isActive !== false) {
          updateProductCount(+1);
        }
        return;
      }
      if (String(newStoreId) === shopId) {
        if (wasActive !== false && isActive === false) {
          updateProductCount(-1);
        } else if (wasActive === false && isActive !== false) {
          updateProductCount(+1);
        }
      }
    };

    const channel = supabase
      .channel(`shop_realtime_${shopId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "store_product_links" }, handleInsert)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "store_product_links" }, handleDelete)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "store_product_links" }, handleUpdate)
      .subscribe();

    return () => {
      isMountedRef.current = false;
      if (debounceRef.current != null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      supabase.removeChannel(channel).catch(() => void 0);
    };
  }, [shopId, enabled, queryClient]);
};

