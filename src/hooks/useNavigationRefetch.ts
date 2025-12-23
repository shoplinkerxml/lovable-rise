import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ProductService } from "@/lib/product-service";

export function useNavigationRefetch(refreshAuth?: () => Promise<void> | void) {
  const queryClient = useQueryClient();
  const location = useLocation();
  useEffect(() => {
    const p = location.pathname.toLowerCase();
    const delay = 150;
    const timer = setTimeout(async () => {
      
      // Products across app
      if (p.includes("/products")) {
        await queryClient.refetchQueries({ queryKey: ["products"], exact: false });
      }
      // Store-specific pages: extract store id when present
      if (p.includes("/user/shops/") && p.includes("/products")) {
        const match = p.match(/\/user\/shops\/(.+?)\/products/);
        const storeId = match?.[1];
        if (storeId) {
          await queryClient.refetchQueries({ queryKey: ["products", storeId], exact: false });
          await ProductService.recomputeStoreCategoryFilterCache(storeId).catch(() => void 0);
        }
      }
      // Tariffs and suppliers
      if (p.includes("/user/tariff")) {
        await queryClient.refetchQueries({ queryKey: ["tariffs:list"], exact: false });
      }
      if (p.includes("/user/suppliers")) {
        await queryClient.refetchQueries({ queryKey: ["suppliers:list"], exact: false });
      }
      // Dashboard: refresh auth if provided
      if (p.includes("/user/dashboard")) {
        try { await refreshAuth?.(); } catch { /* ignore */ }
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [location.pathname, queryClient, refreshAuth]);
}
