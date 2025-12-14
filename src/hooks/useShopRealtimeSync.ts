import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShopCountsService } from "@/lib/shop-counts";
import type { SupabaseClient } from "@supabase/supabase-js";

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
          await ShopCountsService.recompute(queryClient, shopId);
        } catch (error) {
          if (isMountedRef.current) {
            queryClient.invalidateQueries({ queryKey: ["shopCounts", shopId] });
          }
        }
      }, 500);
    };

    const updateProductCount = (delta: number) => {
      ShopCountsService.bumpProducts(queryClient, shopId, delta);
      scheduleCountsRefetch();
    };

    const handleInsert = (payload: any) => {
      const { store_id, is_active } = payload.new;
      if (String(store_id) === shopId && is_active !== false) {
        updateProductCount(+1);
      }
    };

    const handleDelete = (payload: any) => {
      const { store_id, is_active } = payload.old;
      if (String(store_id) === shopId && is_active !== false) {
        updateProductCount(-1);
      }
    };

    const handleUpdate = (payload: any) => {
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

    const client = supabase as SupabaseClient;

    const channel = client
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
      client.removeChannel(channel).catch(() => void 0);
    };
  }, [shopId, enabled, queryClient]);
};
