import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ProductService } from "@/lib/product-service";

export function useNavigationRefetch(refreshAuth?: () => Promise<void> | void) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const lastRunAtRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastRunAtRef.current < 2000) return;
    lastRunAtRef.current = now;
    const p = location.pathname.toLowerCase();
    const run = async () => {
      if (p.includes("/user/shops")) {
        await queryClient.refetchQueries({ queryKey: ["shopsList"], exact: false });
      }
      if (p.includes("/user/products")) {
        try {
          const stores = await ProductService.getUserStores();
          queryClient.setQueryData(["stores:active"], stores || []);
        } catch { /* ignore */ }
        await queryClient.refetchQueries({ queryKey: ["products"], exact: false });
      }
      if (p.includes("/user/tariffs")) {
        await queryClient.refetchQueries({ queryKey: ["tariffs:list"], exact: false });
      }
      if (p.includes("/user/suppliers")) {
        await queryClient.refetchQueries({ queryKey: ["suppliers:list"], exact: false });
      }
      if (p.includes("/user/dashboard")) {
        try { await refreshAuth?.(); } catch { /* ignore */ }
      }
    };
    run();
  }, [location.pathname, queryClient, refreshAuth]);
}
