import type { QueryClient } from "@tanstack/react-query";
import { ShopService } from "./shop-service";
import { ProductService } from "./product-service";
import type { ShopAggregated } from "./shop-service";
import type { ShopCounts } from "@/types/shop";

export const ShopCountsService = {
  key(storeId: string) {
    return ["shopCounts", storeId] as const;
  },
  set(queryClient: QueryClient, storeId: string, counts: ShopCounts) {
    queryClient.setQueryData<ShopCounts>(this.key(storeId), counts);
    queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((s) =>
        String(s.id) === String(storeId)
          ? { ...s, productsCount: counts.productsCount, categoriesCount: counts.categoriesCount }
          : s
      );
    });
    queryClient.setQueryData<ShopAggregated | null>(["shopDetail", storeId], (prev) => {
      if (!prev) return prev;
      return { ...prev, productsCount: counts.productsCount, categoriesCount: counts.categoriesCount };
    });
  },
  bumpProducts(queryClient: QueryClient, storeId: string, delta: number) {
    queryClient.setQueryData<ShopCounts>(this.key(storeId), (old) => {
      const base = old?.productsCount ?? 0;
      const cats = old?.categoriesCount ?? 0;
      const nextProducts = Math.max(0, base + delta);
      const nextCategories = nextProducts === 0 ? 0 : cats;
      return { productsCount: nextProducts, categoriesCount: nextCategories };
    });
    queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((s) =>
        String(s.id) === String(storeId)
          ? {
              ...s,
              productsCount: Math.max(0, (s.productsCount ?? 0) + delta),
              categoriesCount: Math.max(0, (s.productsCount ?? 0) + delta) === 0 ? 0 : (s.categoriesCount ?? 0),
            }
          : s
      );
    });
    queryClient.setQueryData<ShopAggregated | null>(["shopDetail", storeId], (prev) => {
      if (!prev) return prev;
      const nextProductsCount = Math.max(0, Number(prev.productsCount ?? 0) + delta);
      const nextCategoriesCount = nextProductsCount === 0 ? 0 : Math.max(0, Number(prev.categoriesCount ?? 0));
      return { ...prev, productsCount: nextProductsCount, categoriesCount: nextCategoriesCount };
    });
  },
  async recompute(queryClient: QueryClient, storeId: string) {
    const { productsCount, categoriesCount } = await ShopService.recomputeStoreCounts(storeId);
    this.set(queryClient, storeId, { productsCount, categoriesCount });
    return { productsCount, categoriesCount };
  },
};
