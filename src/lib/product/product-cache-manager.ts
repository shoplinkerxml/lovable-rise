import type { ProductAggregated } from "@/lib/product-service";

export class ProductCacheManager {
  static updateFirstPageCaches(storeId: string | null, mutate: (items: unknown[]) => unknown[]) {
    void storeId;
    void mutate;
  }

  static patchProductCaches(
    productId: string,
    patch: Partial<ProductAggregated>,
    storeId?: string | null,
  ) {
    void productId;
    void patch;
    void storeId;
  }

  static clearAllFirstPageCaches() {
    void 0;
  }

  static clearMasterProductsCaches(): void {
    void 0;
  }

  static clearStoreProductsCaches(storeId: string): void {
    void storeId;
  }

  static clearAllProductsCaches(): void {
    ProductCacheManager.clearAllFirstPageCaches();
  }
}
