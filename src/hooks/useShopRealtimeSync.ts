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

    const triggerCountsRefetch = () => {
      scheduleCountsRefetch();
    };

    const handleInsert = (payload: any) => {
      const { store_id, is_active } = payload.new;
      if (String(store_id) === shopId && is_active !== false) {
        triggerCountsRefetch();
      }
    };

    const handleDelete = (payload: any) => {
      const { store_id, is_active } = payload.old;
      if (String(store_id) === shopId && is_active !== false) {
        triggerCountsRefetch();
      }
    };

    const handleUpdate = (payload: any) => {
      const oldRow = payload?.old || {};
      const newRow = payload?.new || {};
      const sidOld = oldRow?.store_id ? String(oldRow.store_id) : "";
      const sidNew = newRow?.store_id ? String(newRow.store_id) : "";
      const wasActive = oldRow?.is_active !== false;
      const isActive = newRow?.is_active !== false;

      if (sidOld === shopId && wasActive) triggerCountsRefetch();
      if (sidNew === shopId && isActive) triggerCountsRefetch();
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
