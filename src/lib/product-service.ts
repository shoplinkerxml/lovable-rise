import { supabase } from "@/integrations/supabase/client";
import { R2Storage } from "@/lib/r2-storage";
import { ApiError } from "./user-service";
import { invokeEdgeWithAuth, SessionValidator } from "./session-validation";
import { SubscriptionValidationService } from "./subscription-validation-service";
import { dedupeInFlight } from "./cache-utils";
import type { TablesInsert } from "@/integrations/supabase/types";
import { CategoryService } from "@/lib/category-service";

export interface Product {
  id: string;
  store_id: string;
  supplier_id?: number | null;
  external_id: string;
  name: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: number | null;
  category_external_id?: string | null;
  currency_id?: string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity: number;
  available: boolean;
  state: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

export interface ProductParam {
  id?: string;
  product_id?: string;
  name: string;
  value: string;
  order_index: number;
  paramid?: string;
  valueid?: string;
}

export interface ProductImage {
  id?: string;
  product_id?: string;
  url: string;
  order_index: number;
  is_main?: boolean;
  alt_text?: string;
}

export interface ProductAggregated extends Product {
  mainImageUrl?: string;
  categoryName?: string;
  supplierName?: string;
  linkedStoreIds?: string[];
}

export interface CreateProductData {
  store_id?: string;
  external_id: string;
  name: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: number | string | null;
  category_external_id?: string | null;
  supplier_id?: number | string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity?: number;
  available?: boolean;
  state?: string;
  params?: ProductParam[];
  images?: ProductImage[];
  links?: Array<{
    store_id: string;
    is_active?: boolean;
    custom_price?: number | null;
    custom_price_promo?: number | null;
    custom_stock_quantity?: number | null;
    custom_available?: boolean | null;
    custom_name?: string | null;
    custom_description?: string | null;
    custom_category_id?: number | null;
  }>;
}

export interface UpdateProductData {
  store_id?: string;
  external_id?: string;
  name?: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: number | string | null;
  category_external_id?: string | null;
  supplier_id?: number | string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity?: number;
  available?: boolean;
  state?: string;
  params?: ProductParam[];
  images?: ProductImage[];
}

export interface ProductLimitInfo {
  current: number;
  max: number;
  canCreate: boolean;
}

type ProductListPage = {
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
  total: number;
};

type ProductListResponseObj = {
  products?: ProductAggregated[];
  page?: ProductListPage;
};

type ImageInput = ProductImage & { object_key?: string };

export interface StoreProductLink {
  is_active?: boolean;
  custom_price?: number | null;
  custom_price_old?: number | null;
  custom_price_promo?: number | null;
  custom_stock_quantity?: number | null;
  custom_available?: boolean | null;
  custom_name?: string | null;
  custom_description?: string | null;
  custom_category_id?: string | null;
}

export type StoreProductLinkPatchInput = Partial<StoreProductLink>;

export class ProductService {
  private static inFlightStores: Promise<
    Array<{
      id: string;
      store_name: string;
      store_url: string | null;
      is_active: boolean;
      productsCount: number;
      categoriesCount: number;
    }>
  > | null = null;

  private static readonly INFLIGHT_LINKS_MAX_SIZE = 200;
  private static readonly INFLIGHT_RECOMPUTE_MAX_SIZE = 50;

  private static inFlightLinksByProduct: Map<string, Promise<string[]>> = new Map();
  private static inFlightRecomputeByStore: Map<string, Promise<void>> = new Map();

  private static castNullableNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private static edgeError(
    error: { context?: { status?: number }; status?: number; statusCode?: number; message?: string } | null,
    fallbackKey: string,
  ): never {
    const status = (error?.context?.status ?? error?.status ?? error?.statusCode) as number | undefined;
    const message = (error?.message as string | undefined) || undefined;
    if (status === 403) throw new ApiError("permission_denied", 403, "PERMISSION_DENIED");
    if (status === 400) throw new ApiError("products_limit_reached", 400, "LIMIT_REACHED");
    if (status === 422) throw new ApiError("validation_error", 422, "VALIDATION_ERROR");
    throw new ApiError(message || fallbackKey, status || 500);
  }

  private static async invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
    try {
      return await invokeEdgeWithAuth<T>(name, body);
    } catch (error) {
      ProductService.edgeError(error as any, name);
      throw new ApiError(name, 500);
    }
  }

  static async getUserLookups(): Promise<{
    suppliers: Array<{ id: string; supplier_name: string }>;
    currencies: Array<{ id: number; name: string; code: string; status: boolean }>;
    supplierCategoriesMap: Record<
      string,
      Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>
    >;
  }> {
    const resp = await ProductService.invokeEdge<{
      suppliers?: any[];
      currencies?: any[];
      supplierCategoriesMap?: Record<string, any[]>;
    }>("get-user-lookups", {});
    const result = {
      suppliers: Array.isArray(resp.suppliers) ? resp.suppliers : [],
      currencies: Array.isArray(resp.currencies) ? resp.currencies : [],
      supplierCategoriesMap: resp.supplierCategoriesMap || {},
    };
    return result;
  }

  /** Получение store_ids текущего пользователя (через функции) */
  private static async getUserStoreIds(): Promise<string[]> {
    const stores = await ProductService.getUserStores();
    return stores.filter((s) => s.is_active).map((s) => s.id);
  }

  /** Получение полной информации о магазинах пользователя (только функции + кэш) */
  static async getUserStores(): Promise<
    Array<{
      id: string;
      store_name: string;
      store_url: string | null;
      is_active: boolean;
      productsCount: number;
      categoriesCount: number;
    }>
  > {
    if (ProductService.inFlightStores) {
      return ProductService.inFlightStores;
    }
    const task = (async () => {
      try {
        const { UserAuthService } = await import("@/lib/user-auth-service");
        const authMe = await UserAuthService.fetchAuthMe();
        if (Array.isArray((authMe as any)?.userStores)) {
          return (authMe.userStores || []).map((s: any) => ({
            id: String(s.id),
            store_name: String(s.store_name || ""),
            store_url: null,
            is_active: true,
            productsCount: 0,
            categoriesCount: 0,
          }));
        }
      } catch {
        void 0;
      }

      const { ShopService } = await import("@/lib/shop-service");
      const shops = await ShopService.getShopsAggregated();
      const mapped = (shops || []).map((s) => ({
        id: String(s.id),
        store_name: String(s.store_name || ""),
        store_url: s.store_url ? String(s.store_url) : null,
        is_active: !!s.is_active,
        productsCount: Number(s.productsCount ?? 0),
        categoriesCount: Number(s.categoriesCount ?? 0),
      }));
      return mapped;
    })();
    ProductService.inFlightStores = task;
    try {
      return await task;
    } finally {
      ProductService.inFlightStores = null;
    }
  }

  static async getUserMasterProducts(): Promise<ProductAggregated[]> {
    try {
      const resp = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", {});
      const rows = Array.isArray(resp?.products) ? resp.products! : [];
      return rows;
    } catch {
      const fb = await ProductService.fetchProductsPageFallback(null, 50, 0);
      return fb.products;
    }
  }

  static async getStoreProducts(storeId: string): Promise<ProductAggregated[]> {
    if (!storeId || storeId.trim() === "") {
      throw new Error("Store ID is required");
    }
    try {
      const resp = await ProductService.invokeEdge<ProductListResponseObj>("store-products-list", {
        store_id: String(storeId),
      });
      const rows = Array.isArray(resp?.products) ? resp.products! : [];
      return rows;
    } catch {
      const fb = await ProductService.fetchProductsPageFallback(String(storeId), 50, 0);
      return fb.products;
    }
  }

  static async getUserMasterProductsPage(
    limit: number,
    options?: { bypassCache?: boolean },
  ): Promise<{
    products: ProductAggregated[];
    page: ProductListPage;
  }> {
    try {
      const fresh = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", {
        limit,
        offset: 0,
        bypassCache: options?.bypassCache === true,
      });
      const products = Array.isArray(fresh?.products) ? fresh.products! : [];
      const page: ProductListPage = {
        limit,
        offset: 0,
        hasMore: !!fresh?.page?.hasMore,
        nextOffset: fresh?.page?.nextOffset ?? null,
        total: fresh?.page?.total ?? products.length,
      };
      return { products, page };
    } catch (error) {
      const fb = await ProductService.fetchProductsPageFallback(null, limit, 0);
      return fb;
    }
  }

  static async getStoreProductsPage(
    storeId: string,
    limit: number,
    options?: { bypassCache?: boolean },
  ): Promise<{
    products: ProductAggregated[];
    page: ProductListPage;
  }> {
    if (!storeId || storeId.trim() === "") {
      throw new Error("Store ID is required");
    }

    try {
      const fresh = await ProductService.invokeEdge<ProductListResponseObj>("store-products-list", {
        store_id: String(storeId),
        limit,
        offset: 0,
        bypassCache: options?.bypassCache === true,
      });
      const products = Array.isArray(fresh?.products) ? fresh.products! : [];
      const page: ProductListPage = {
        limit,
        offset: 0,
        hasMore: !!fresh?.page?.hasMore,
        nextOffset: fresh?.page?.nextOffset ?? null,
        total: fresh?.page?.total ?? products.length,
      };
      return { products, page };
    } catch (error) {
      const fb = await ProductService.fetchProductsPageFallback(String(storeId), limit, 0);
      return fb;
    }
  }

  /**
   * @deprecated Використовуй getStoreProducts(storeId)
   */
  static async getProductsForStore(storeId: string): Promise<Product[]> {
    const productsAgg = await ProductService.getStoreProducts(storeId);
    return productsAgg as unknown as Product[];
  }

  /**
   * @deprecated Використовуй getUserMasterProducts() або getStoreProducts(storeId)
   */
  static async getProductsAggregated(storeId?: string | null): Promise<ProductAggregated[]> {
    if (storeId) {
      return ProductService.getStoreProducts(storeId);
    }
    return ProductService.getUserMasterProducts();
  }

  /**
   * @deprecated Використовуй getUserMasterProductsPage() або getStoreProductsPage()
   */
  static async getProductsFirstPage(
    storeId: string | null,
    limit: number,
    options?: { bypassCache?: boolean },
  ): Promise<{
    products: ProductAggregated[];
    page: ProductListPage;
  }> {
    if (storeId) {
      return ProductService.getStoreProductsPage(storeId, limit, options);
    }
    return ProductService.getUserMasterProductsPage(limit, options);
  }

  private static async fetchProductsPageFallback(
    storeId: string | null,
    limit: number,
    offset: number,
  ): Promise<{ products: ProductAggregated[]; page: ProductListPage }> {
    try {
      const resp = await ProductService.invokeEdge<ProductListResponseObj>(
        storeId ? "store-products-list" : "user-products-list",
        {
          ...(storeId ? { store_id: String(storeId) } : {}),
          limit,
          offset,
          bypassCache: true,
        },
      );
      const products = Array.isArray(resp?.products) ? resp.products : [];
      const page: ProductListPage = {
        limit,
        offset,
        hasMore: !!resp?.page?.hasMore,
        nextOffset: resp?.page?.nextOffset ?? null,
        total: resp?.page?.total ?? products.length,
      };
      return { products, page };
    } catch {
      return { products: [], page: { limit, offset, hasMore: false, nextOffset: null, total: 0 } };
    }
  }

  static async getProductsPage(
    storeId: string | null,
    limit: number,
    offset: number,
  ): Promise<{
    products: ProductAggregated[];
    page: {
      limit: number;
      offset: number;
      hasMore: boolean;
      nextOffset: number | null;
      total: number;
    };
  }> {
    try {
      const resp = await ProductService.invokeEdge<ProductListResponseObj>(storeId ? "store-products-list" : "user-products-list", {
        ...(storeId ? { store_id: storeId } : {}),
        limit,
        offset,
      });
      const products = Array.isArray(resp?.products) ? resp!.products! : [];
      const page: ProductListPage = {
        limit,
        offset,
        hasMore: !!resp?.page?.hasMore,
        nextOffset: resp?.page?.nextOffset ?? null,
        total: resp?.page?.total ?? products.length,
      };
      return { products, page };
    } catch {
      return await ProductService.fetchProductsPageFallback(storeId ?? null, limit, offset);
    }
  }

  static updateFirstPageCaches(
    storeId: string | null,
    mutate: (items: unknown[]) => unknown[],
  ) {
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

  static async recomputeStoreCategoryFilterCache(storeId: string): Promise<void> {
    try {
      await ProductService.getStoreCategoryFilterOptions(storeId);
    } catch (error) {
      console.error("ProductService.recomputeStoreCategoryFilterCache failed", error);
    }
  }

  static async recomputeStoreCategoryFilterCacheBatch(storeIds: string[]): Promise<void> {
    const unique = Array.from(new Set((storeIds || []).map(String).filter(Boolean)));
    const tasks = unique.map((sid) =>
      dedupeInFlight(
        ProductService.inFlightRecomputeByStore,
        sid,
        () => ProductService.recomputeStoreCategoryFilterCache(sid),
        { maxSize: ProductService.INFLIGHT_RECOMPUTE_MAX_SIZE },
      ),
    );
    await Promise.all(tasks);
  }

  static async getStoreCategoryFilterOptions(storeId: string): Promise<string[]> {
    const resp = await ProductService.invokeEdge<{ names?: string[] }>(
      "store-category-filter-options",
      { store_id: storeId },
    );
    const names = (resp?.names || []).filter((v) => typeof v === "string");
    return names;
  }

  static async refreshStoreCategoryFilterOptions(storeIds: string[]): Promise<Record<string, string[]>> {
    const unique = Array.from(new Set((storeIds || []).map(String).filter(Boolean)));
    if (unique.length === 0) return {};
    const resp = await ProductService.invokeEdge<{ results?: Record<string, string[]>; names?: string[] }>(
      "store-category-filter-options",
      { store_ids: unique },
    );
    const results: Record<string, string[]> = resp?.results || {};
    return results;
  }

  /** Получить и обновить переопределения для пары (product_id, store_id) через product-edit-data */
  static async getStoreProductLink(
    productId: string,
    storeId: string,
  ): Promise<StoreProductLink | null> {
    const edit = await ProductService.getProductEditData(productId, storeId);
    return edit.link || null;
  }

  static async updateStoreProductLink(
    productId: string,
    storeId: string,
    patch: Partial<StoreProductLinkPatchInput>,
  ): Promise<StoreProductLink | null> {
    try {
      const resp = await invokeEdgeWithAuth<{ link?: StoreProductLink | null }>(
        "update-store-product-link",
        { product_id: productId, store_id: storeId, patch },
      );
      return resp?.link ?? null;
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (status === 403) throw new Error("Недостатньо прав");
      const msg = (error as { message?: string } | null)?.message || "update_failed";
      throw new Error(msg);
    }
  }

  static async saveStoreProductEdit(
    productId: string,
    storeId: string,
    payload: {
      supplier_id?: number | string | null;
      category_id?: number | string | null;
      category_external_id?: string | null;
      currency_code?: string | null;
      external_id?: string | null;
      name?: string;
      name_ua?: string | null;
      vendor?: string | null;
      article?: string | null;
      available?: boolean;
      stock_quantity?: number;
      price?: number | null;
      price_old?: number | null;
      price_promo?: number | null;
      description?: string | null;
      description_ua?: string | null;
      docket?: string | null;
      docket_ua?: string | null;
      state?: string;
      images?: ProductImage[];
      params?: ProductParam[];
      linkPatch?: StoreProductLinkPatchInput;
    },
  ): Promise<{ product_id: string; link?: StoreProductLink | null } | null> {
    const out = await ProductService.invokeEdge<{ product_id?: string; link?: StoreProductLink | null }>(
      "save-store-product-edit",
      { product_id: productId, store_id: storeId, ...payload },
    );
    const pid = out?.product_id ? String(out.product_id) : null;
    if (pid) {
      try {
        const patch: Partial<ProductAggregated> = {};
        if (payload.name !== undefined) patch.name = payload.name as string;
        if (payload.name_ua !== undefined) patch.name_ua = payload.name_ua ?? null;
        if (payload.price !== undefined) patch.price = payload.price ?? null;
        if (payload.price_old !== undefined) patch.price_old = payload.price_old ?? null;
        if (payload.price_promo !== undefined) patch.price_promo = payload.price_promo ?? null;
        if (payload.available !== undefined) patch.available = !!payload.available;
        if (payload.stock_quantity !== undefined) patch.stock_quantity = Number(payload.stock_quantity || 0);
        if (payload.category_id !== undefined) patch.category_id = (payload.category_id as number | null) ?? null;
        if (payload.category_external_id !== undefined) patch.category_external_id = payload.category_external_id ?? null;
        if (Array.isArray(payload.images)) {
          const main = (payload.images || []).find((i) => !!i.is_main) || (payload.images || [])[0];
          if (main?.url) patch.mainImageUrl = String(main.url);
        }
        ProductService.patchProductCaches(pid, patch, storeId);
      } catch (error) {
        console.error("ProductService.saveStoreProductEdit cache update failed", error);
      }
    }
    return pid ? { product_id: pid, link: out.link } : null;
  }

  static async removeStoreProductLink(
    productId: string,
    storeId: string,
  ): Promise<void> {
    try {
      await invokeEdgeWithAuth<unknown>(
        "bulk-remove-store-product-links",
        { product_ids: [productId], store_ids: [storeId] },
      );
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || "delete_failed";
      throw new Error(msg);
    }
    try {
      ProductService.clearStoreProductsCaches(String(storeId));
    } catch (e) {
      console.error("ProductService.removeStoreProductLink clearStoreProductsCaches failed", e);
    }
  }

  static async bulkRemoveStoreProductLinks(
    productIds: string[],
    storeIds: string[],
  ): Promise<{ deleted: number; deletedByStore: Record<string, number>; categoryNamesByStore?: Record<string, string[]> }> {
    let out: { deleted?: number; deletedByStore?: Record<string, number>; categoryNamesByStore?: Record<string, string[]> };
    try {
      out = await invokeEdgeWithAuth("bulk-remove-store-product-links", { product_ids: productIds, store_ids: storeIds });
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || "bulk_delete_failed";
      throw new Error(msg);
    }
    try {
      const { ShopService } = await import("@/lib/shop-service");
      const catsByStore = out.categoryNamesByStore || {};
      for (const sid of Object.keys(catsByStore)) {
        const cnt = Array.isArray(catsByStore[sid]) ? catsByStore[sid].length : 0;
        ShopService.setCategoriesCountInCache(String(sid), cnt);
      }
    } catch (error) {
      console.error("ProductService.bulkRemoveStoreProductLinks ShopService sync failed", error);
    }
    return { deleted: out.deleted ?? 0, deletedByStore: out.deletedByStore ?? {}, categoryNamesByStore: out.categoryNamesByStore || {} };
  }

  static async bulkAddStoreProductLinks(payload: Array<{
    product_id: string;
    store_id: string;
    is_active?: boolean;
    custom_price?: number | null;
    custom_price_old?: number | null;
    custom_price_promo?: number | null;
    custom_stock_quantity?: number | null;
    custom_available?: boolean | null;
  }>): Promise<{ inserted: number; addedByStore: Record<string, number>; categoryNamesByStore?: Record<string, string[]> }> {
    let out: { inserted?: number; addedByStore?: Record<string, number>; categoryNamesByStore?: Record<string, string[]> };
    try {
      out = await invokeEdgeWithAuth("bulk-add-store-product-links", { links: payload });
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || "bulk_insert_failed";
      throw new Error(msg);
    }
    try {
      const { ShopService } = await import("@/lib/shop-service");
      const catsByStore = out.categoryNamesByStore || {};
      for (const sid of Object.keys(catsByStore)) {
        const cnt = Array.isArray(catsByStore[sid]) ? catsByStore[sid].length : 0;
        ShopService.setCategoriesCountInCache(String(sid), cnt);
      }
    } catch (error) {
      console.error("ProductService.bulkAddStoreProductLinks ShopService sync failed", error);
    }
    return { inserted: out.inserted ?? 0, addedByStore: out.addedByStore ?? {}, categoryNamesByStore: out.categoryNamesByStore || {} };
  }

  static async getStoreLinksForProduct(productId: string): Promise<string[]> {
    return dedupeInFlight(
      ProductService.inFlightLinksByProduct,
      productId,
      async () => {
        const payload = await ProductService.invokeEdge<{ store_ids?: string[] }>(
          "get-store-links-for-product",
          { product_id: productId },
        );
        return Array.isArray(payload.store_ids) ? payload.store_ids.map(String) : [];
      },
      { maxSize: ProductService.INFLIGHT_LINKS_MAX_SIZE },
    );
  }

  static invalidateStoreLinksCache(productId: string) {
    try {
      ProductService.inFlightLinksByProduct.delete(productId);
    } catch (error) {
      console.error("ProductService.invalidateStoreLinksCache failed", error);
    }
  }

  /** Максимальный лимит продуктов: через отдельную функцию get-product-limit-only */
  static async getProductLimitOnly(): Promise<number> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
    try {
      const resp = await ProductService.invokeEdge<{ value?: number }>("get-product-limit-only", {});
      const v = Number(resp?.value ?? 0) || 0;
      return v;
    } catch (e) {
      return 0;
    }
  }

  /** Лимит продуктов для текущего пользователя */
  static async getProductLimit(): Promise<ProductLimitInfo> {
    const maxProducts = await this.getProductLimitOnly();
    const currentCount = await this.getProductsCount();

    return {
      current: currentCount,
      max: maxProducts,
      canCreate: currentCount < maxProducts,
    };
  }

  static invalidateProductLimitCache() {
    void 0;
  }

  /** Количество продуктов текущего пользователя: только функция user-products-list */
  static async getProductsCount(): Promise<number> {
    try {
      const sessionValidation = await SessionValidator.ensureValidSession();
      if (!sessionValidation.isValid) {
        throw new Error(
          "Invalid session: " + (sessionValidation.error || "Session expired"),
        );
      }
      const resp = await ProductService.invokeEdge<ProductListResponseObj>(
        "user-products-list",
        { store_id: null, limit: 1, offset: 0 },
      );
      const page = (resp?.page || {}) as { total?: number };
      const total =
        typeof page.total === "number"
          ? page.total
          : Array.isArray(resp?.products)
          ? resp.products.length
          : 0;
      return total || 0;
    } catch (error) {
      console.error("Get products count error:", error);
      return 0;
    }
  }

  static async getProductsCountCached(): Promise<number> {
    return await ProductService.getProductsCount();
  }

  /** Полный список продуктов текущего пользователя (по функциям с пагинацией + кэш) */
  static async getProducts(): Promise<Product[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const limit = 50;
    let offset = 0;
    let all: ProductAggregated[] = [];
    let hasMore = true;

    while (hasMore) {
      let products: ProductAggregated[] = [];
      let page: ProductListPage | null = null;
      try {
        const resp = await ProductService.invokeEdge<ProductListResponseObj>("user-products-list", {
          store_id: null,
          limit,
          offset,
        });
        products = Array.isArray(resp?.products) ? resp!.products! : [];
        page = {
          limit,
          offset,
          hasMore: !!resp?.page?.hasMore,
          nextOffset: resp?.page?.nextOffset ?? null,
          total: resp?.page?.total ?? products.length,
        };
      } catch {
        const fb = await ProductService.fetchProductsPageFallback(null, limit, offset);
        products = fb.products;
        page = fb.page;
      }
      all = [...all, ...products];
      hasMore = !!page?.hasMore;
      const nextOffset = page?.nextOffset ?? null;
      if (nextOffset == null) break;
      offset = nextOffset;
      if (all.length >= 1000) break;
    }

    return all as unknown as Product[];
  }

  /** Параметры товара: через product-edit-data */
  static async getProductParams(productId: string): Promise<ProductParam[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const edit = await ProductService.getProductEditData(productId);
    return edit.params || [];
  }

  /** Изображения товара: через product-edit-data */
  static async getProductImages(productId: string): Promise<ProductImage[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const edit = await ProductService.getProductEditData(productId);
    return edit.images || [];
  }

  /** Получение товара по ID: через product-edit-data */
  static async getProductById(id: string): Promise<Product | null> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const edit = await ProductService.getProductEditData(id);
    return edit.product || null;
  }

  /** Агрегированная загрузка данных для страницы редактирования товара */
  static async getProductEditData(
    productId: string,
    storeId?: string,
  ): Promise<{
    product: Product | null;
    link: StoreProductLink | null;
    images: ProductImage[];
    params: ProductParam[];
    supplier?: { id: number; supplier_name: string } | null;
    categoryName?: string | null;
    shop?: { id: string; store_name: string } | null;
    storeCategories?: Array<{
      store_category_id: number;
      category_id: number;
      name: string;
      store_external_id: string | null;
      is_active: boolean;
    }>;
    suppliers?: Array<{ id: string; supplier_name: string }>;
    currencies?: Array<{
      id: number;
      name: string;
      code: string;
      status: boolean | null;
    }>;
    categories?: Array<{
      id: string;
      name: string;
      external_id: string;
      supplier_id: string;
      parent_external_id: string | null;
    }>;
    supplierCategoriesMap?: Record<
      string,
      Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>
    >;
  }> {
    if (!String(productId || "").trim()) {
      throw new Error("product_id_required");
    }
    let resp: {
      product?: Product | null;
      link?: StoreProductLink | null;
      images?: ProductImage[];
      params?: ProductParam[];
      supplier?: { id: number; supplier_name: string } | null;
      categoryName?: string | null;
      shop?: { id: string; store_name: string } | null;
      storeCategories?: Array<{
        store_category_id: number;
        category_id: number;
        name: string;
        store_external_id: string | null;
        is_active: boolean;
      }>;
      suppliers?: Array<{ id: string; supplier_name: string }>;
      currencies?: Array<{ id: number; name: string; code: string; status: boolean | null }>;
      categories?: Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>;
      supplierCategoriesMap?: Record<string, Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>>;
    };
    try {
      resp = await invokeEdgeWithAuth(
        "product-edit-data",
        storeId
          ? { product_id: String(productId), store_id: String(storeId) }
          : { product_id: String(productId) },
      );
    } catch (error) {
      this.edgeError(error as any, "failed_load_product_edit");
      throw new ApiError("failed_load_product_edit", 500);
    }
    return {
      product: (resp?.product || null) as Product | null,
      link: (resp?.link || null) as StoreProductLink | null,
      images: (resp?.images || []) as ProductImage[],
      params: (resp?.params || []) as ProductParam[],
      supplier: (resp?.supplier || null) as {
        id: number;
        supplier_name: string;
      } | null,
      categoryName: (resp?.categoryName ?? null) as string | null,
      shop: (resp?.shop ?? null) as { id: string; store_name: string } | null,
      storeCategories: (resp?.storeCategories || []) as Array<{
        store_category_id: number;
        category_id: number;
        name: string;
        store_external_id: string | null;
        is_active: boolean;
      }>,
      suppliers: (resp?.suppliers || []) as Array<{
        id: string;
        supplier_name: string;
      }>,
      currencies: (resp?.currencies || []) as Array<{
        id: number;
        name: string;
        code: string;
        status: boolean | null;
      }>,
      categories: (resp?.categories || []) as Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>,
      supplierCategoriesMap: (resp?.supplierCategoriesMap ||
        {}) as Record<
        string,
        Array<{
          id: string;
          name: string;
          external_id: string;
          supplier_id: string;
          parent_external_id: string | null;
        }>
      >,
    };
  }

  /** Один продукт по ID */
  static async getProduct(id: string): Promise<Product> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error("Товар не найден");
    }
    return product;
  }

  /** Создание нового продукта (через функцию create-product) */
  static async createProduct(productData: CreateProductData): Promise<Product> {
    let effectiveStoreId = productData.store_id;
    const allowedStoreIds = await this.getUserStoreIds();
    if (!effectiveStoreId || effectiveStoreId.trim() === "") {
      effectiveStoreId = allowedStoreIds[0];
      if (!effectiveStoreId) {
        throw new Error("Активний магазин не знайдено");
      }
    } else if (!allowedStoreIds.includes(String(effectiveStoreId))) {
      throw new Error("Store access denied");
    }

    const currencyCode =
      (productData.currency_code && String(productData.currency_code).trim()) ||
      "UAH";

    const payload: Record<string, unknown> = {
      store_id: effectiveStoreId,
      supplier_id: this.castNullableNumber(productData.supplier_id),
      category_id: this.castNullableNumber(productData.category_id),
      category_external_id: productData.category_external_id ?? null,
      currency_code: currencyCode,
      external_id: productData.external_id ?? null,
      name: productData.name,
      name_ua: productData.name_ua ?? null,
      vendor: productData.vendor ?? null,
      article: productData.article ?? null,
      available:
        productData.available !== undefined ? productData.available : true,
      stock_quantity: productData.stock_quantity ?? 0,
      price: productData.price ?? null,
      price_old: productData.price_old ?? null,
      price_promo: productData.price_promo ?? null,
      description: productData.description ?? null,
      description_ua: productData.description_ua ?? null,
      docket: productData.docket ?? null,
      docket_ua: productData.docket_ua ?? null,
      state: productData.state ?? "new",
      images: (productData.images || []).map((img, index) => {
        const input = img as ImageInput;
        return {
          key: input.object_key || undefined,
          url: input.url,
          order_index: typeof input.order_index === "number" ? input.order_index : index,
          is_main: !!input.is_main,
        };
      }),
      params: (productData.params || []).map((p, index) => ({
        name: p.name,
        value: p.value,
        order_index:
          typeof p.order_index === "number" ? p.order_index : index,
        paramid: p.paramid ?? null,
        valueid: p.valueid ?? null,
      })),
      links: productData.links || undefined,
    };

    const respCreate = await ProductService.invokeEdge<{ product_id?: string }>(
      "create-product",
      payload,
    );
    const productId = respCreate?.product_id;
    if (!productId) throw new Error("create_failed");
    const product = await this.getProductById(productId);
    if (!product) throw new Error("create_failed");

    const origImages = (productData.images || []).map((img, index) => {
      const input = img as ImageInput;
      return {
        object_key: input.object_key || undefined,
        url: input.url,
        order_index: typeof input.order_index === "number" ? input.order_index : index,
        is_main: !!input.is_main,
      };
    });
    const processed = await Promise.all(
      origImages.map(async (i) => {
        const key = i.object_key || undefined;
        const u = String(i.url || "").trim();
        if (key) {
          return { object_key: key, url: u, order_index: i.order_index, is_main: i.is_main };
        }
        if (!u) {
          return { object_key: undefined, url: u, order_index: i.order_index, is_main: i.is_main };
        }
        if (/^(https?:\/\/|data:)/i.test(u)) {
          try {
            const res = await R2Storage.uploadProductImageFromUrl(String(productId), u);
            const nextKey = res.r2KeyOriginal || undefined;
            const nextUrl = res.originalUrl || u;
            return { object_key: nextKey, url: nextUrl, order_index: i.order_index, is_main: i.is_main };
          } catch {
            return { object_key: undefined, url: u, order_index: i.order_index, is_main: i.is_main };
          }
        }
        return { object_key: undefined, url: u, order_index: i.order_index, is_main: i.is_main };
      })
    );
    const needUpdate = processed.some((p, idx) => {
      const oi = origImages[idx];
      const changedKey = !!(p as { object_key?: string }).object_key && !oi.object_key;
      return changedKey;
    });
    if (needUpdate) {
      await ProductService.updateProduct(String(productId), { images: processed as unknown as ProductImage[] });
    }
    try {
      ProductService.clearMasterProductsCaches();
      if (productData.links) {
        for (const link of productData.links) {
          if (link.store_id) {
            ProductService.clearStoreProductsCaches(String(link.store_id));
          }
        }
      }
    } catch (error) {
      console.error("ProductService.createProduct clear caches failed", error);
    }
    ProductService.invalidateProductLimitCache();
    return product;
  }

  static async duplicateProduct(id: string): Promise<Product> {
    const respDup = await ProductService.invokeEdge<{ product?: Product }>(
      "duplicate-product",
      { productId: id },
    );
    const product = respDup?.product as Product | undefined;
    if (!product) {
      throw new Error("duplicate_failed");
    }
    try {
      ProductService.clearAllFirstPageCaches();
    } catch (error) {
      console.error("ProductService.duplicateProduct clearAllFirstPageCaches failed", error);
    }
    return product;
  }

  /** Обновление товара через функцию update-product */
  static async updateProduct(id: string, productData: UpdateProductData): Promise<void> {
    await this.ensureCanMutateProducts();
    const categoryIdValue: number | null | undefined =
      productData.category_id !== undefined
        ? this.castNullableNumber(productData.category_id)
        : undefined;

    const payload: Record<string, unknown> = {
      product_id: id,
      supplier_id:
        productData.supplier_id !== undefined
          ? this.castNullableNumber(productData.supplier_id)
          : undefined,
      category_id:
        productData.category_id !== undefined ? categoryIdValue : undefined,
      category_external_id:
        productData.category_external_id !== undefined
          ? productData.category_external_id
          : undefined,
      currency_code:
        productData.currency_code !== undefined
          ? productData.currency_code
          : undefined,
      external_id:
        productData.external_id !== undefined ? productData.external_id : undefined,
      name: productData.name !== undefined ? productData.name : undefined,
      name_ua: productData.name_ua !== undefined ? productData.name_ua : undefined,
      vendor: productData.vendor !== undefined ? productData.vendor : undefined,
      article: productData.article !== undefined ? productData.article : undefined,
      available:
        productData.available !== undefined ? productData.available : undefined,
      stock_quantity:
        productData.stock_quantity !== undefined
          ? productData.stock_quantity
          : undefined,
      price: productData.price !== undefined ? productData.price : undefined,
      price_old:
        productData.price_old !== undefined ? productData.price_old : undefined,
      price_promo:
        productData.price_promo !== undefined ? productData.price_promo : undefined,
      description:
        productData.description !== undefined ? productData.description : undefined,
      description_ua:
        productData.description_ua !== undefined
          ? productData.description_ua
          : undefined,
      docket: productData.docket !== undefined ? productData.docket : undefined,
      docket_ua:
        productData.docket_ua !== undefined ? productData.docket_ua : undefined,
      state: productData.state !== undefined ? productData.state : undefined,
      images:
        productData.images !== undefined
          ? (productData.images || []).map((img, index) => {
              const input = img as ImageInput;
              return {
                key: input.object_key || undefined,
                url: input.url,
                order_index: typeof input.order_index === "number" ? input.order_index : index,
                is_main: !!input.is_main,
              };
            })
          : undefined,
      params:
        productData.params !== undefined
          ? (productData.params || []).map((p, index) => ({
              name: p.name,
              value: p.value,
              order_index:
                typeof p.order_index === "number" ? p.order_index : index,
              paramid: p.paramid ?? null,
              valueid: p.valueid ?? null,
            }))
          : undefined,
    };

    const respUpdate = await ProductService.invokeEdge<{ product_id?: string }>(
      "update-product",
      payload,
    );
    const productId = respUpdate?.product_id || id;
    try {
      const patch: Partial<ProductAggregated> = {};
      if (payload.name !== undefined) patch.name = payload.name as string;
      if (payload.name_ua !== undefined) patch.name_ua = (payload.name_ua as string | null) ?? null;
      if (payload.price !== undefined) patch.price = (payload.price as number | null) ?? null;
      if (payload.price_old !== undefined) patch.price_old = (payload.price_old as number | null) ?? null;
      if (payload.price_promo !== undefined) patch.price_promo = (payload.price_promo as number | null) ?? null;
      if (payload.available !== undefined) patch.available = !!payload.available;
      if (payload.stock_quantity !== undefined) patch.stock_quantity = Number(payload.stock_quantity || 0);
      if (payload.vendor !== undefined) patch.vendor = (payload.vendor as string | null) ?? null;
      if (payload.article !== undefined) patch.article = (payload.article as string | null) ?? null;
      if (payload.category_id !== undefined) patch.category_id = (payload.category_id as number | null) ?? null;
      if (payload.category_external_id !== undefined) patch.category_external_id = (payload.category_external_id as string | null) ?? null;
      if (payload.state !== undefined) patch.state = payload.state as string;
      if (Array.isArray(payload.images)) {
        const images = payload.images as Array<{ url: string; is_main?: boolean }>;
        const main = images.find((i) => !!i.is_main) || images[0];
        if (main?.url) patch.mainImageUrl = String(main.url);
      }
      ProductService.patchProductCaches(String(productId), patch, null);
      if (productData.store_id != null && String(productData.store_id).trim() !== "") {
        ProductService.patchProductCaches(String(productId), patch, String(productData.store_id));
      }
    } catch (error) {
      console.error("ProductService.updateProduct cache update failed", error);
    }
    void productId;
    return;
  }

  /** Удаление товара */
  static async deleteProduct(id: string): Promise<void> {
    await this.ensureCanMutateProducts();
    const respDel = await ProductService.invokeEdge<{ success?: boolean }>(
      "delete-product",
      { product_ids: [String(id)] },
    );
    const ok = respDel?.success === true;
    if (!ok) {
      throw new Error("delete_failed");
    }
    try {
      ProductService.clearMasterProductsCaches();
      ProductService.clearAllProductsCaches();
    } catch (error) {
      console.error("ProductService.deleteProduct clear caches failed", error);
    }
    ProductService.invalidateProductLimitCache();
  }

  static async bulkDeleteProducts(ids: string[]): Promise<{ deleted: number }> {
    await this.ensureCanMutateProducts();
    const validIds = Array.from(new Set(ids.map(String).filter(Boolean)));
    if (validIds.length === 0) return { deleted: 0 };
    const respDel2 = await ProductService.invokeEdge<{ success?: boolean }>(
      "delete-product",
      { product_ids: validIds },
    );
    const ok = respDel2?.success === true;
    if (!ok) throw new Error("delete_failed");
    try {
      ProductService.clearMasterProductsCaches();
      ProductService.clearAllProductsCaches();
    } catch (error) {
      console.error("ProductService.bulkDeleteProducts clear caches failed", error);
    }
    ProductService.invalidateProductLimitCache();
    return { deleted: validIds.length };
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
    ProductService.clearAllFirstPageCaches();
  }

  /** Проверка только валидности сессии (без дополнительных запросов) */
  private static async ensureCanMutateProducts(): Promise<void> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }
  }

  /** Проверка права на создание (сессия + актуальная подписка) */
  private static async ensureCanCreateProduct(): Promise<void> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid || !sessionValidation.user?.id) {
      throw new Error("Invalid session");
    }
    const subscription = await SubscriptionValidationService.getValidSubscription(sessionValidation.user.id);
    if (!subscription) throw new Error("No valid subscription");
  }

  /** Батчевое обновление/вставка товаров напрямую через upsert */
  static async bulkUpsertProducts(rows: Array<UpdateProductData & { id: string; store_id?: string }>): Promise<{ upserted: number }>{
    await this.ensureCanMutateProducts();
    if (!Array.isArray(rows) || rows.length === 0) return { upserted: 0 };
    const payload = rows.map((r) => ({
      id: String(r.id),
      store_id: r.store_id ?? null,
      external_id: r.external_id ?? undefined,
      name: r.name ?? undefined,
      name_ua: r.name_ua ?? undefined,
      vendor: r.vendor ?? undefined,
      article: r.article ?? undefined,
      available: r.available ?? undefined,
      stock_quantity: r.stock_quantity ?? undefined,
      price: r.price ?? undefined,
      price_old: r.price_old ?? undefined,
      price_promo: r.price_promo ?? undefined,
      description: r.description ?? undefined,
      description_ua: r.description_ua ?? undefined,
      docket: r.docket ?? undefined,
      docket_ua: r.docket_ua ?? undefined,
      state: r.state ?? undefined,
      category_id: ProductService.castNullableNumber(r.category_id) ?? undefined,
      category_external_id: r.category_external_id ?? undefined,
      currency_code: r.currency_code ?? undefined,
      supplier_id: ProductService.castNullableNumber(r.supplier_id) ?? undefined,
    })) as unknown as TablesInsert<'store_products'>[];
    const { error } = await supabase
      .from("store_products")
      .upsert(payload);
    if (error) throw new Error((error as { message?: string } | null)?.message || "bulk_upsert_failed");
    try {
      ProductService.clearAllProductsCaches();
    } catch (e) {
      console.error("ProductService.bulkUpsertProducts clearAllProductsCaches failed", e);
    }
    ProductService.invalidateProductLimitCache();
    return { upserted: payload.length };
  }
  /** Агрегированные справочники для страницы создания товара */
  static async getNewProductLookup(): Promise<{
    suppliers: Array<{ id: string; supplier_name: string }>;
    currencies: Array<{ id: number; name: string; code: string; status: boolean | null }>;
    supplierCategoriesMap: Record<string, Array<{
      id: string;
      name: string;
      external_id: string;
      supplier_id: string;
      parent_external_id: string | null;
    }>>;
  }> {
    const resp = await ProductService.invokeEdge<{
      suppliers?: Array<{ id: string; supplier_name: string }>;
      currencies?: Array<{ id: number; name: string; code: string; status: boolean | null }>;
      supplierCategoriesMap?: Record<string, Array<{
        id: string;
        name: string;
        external_id: string;
        supplier_id: string;
        parent_external_id: string | null;
      }>>;
    }>("new-product-lookup", {});
    return {
      suppliers: Array.isArray(resp.suppliers) ? resp.suppliers : [],
      currencies: Array.isArray(resp.currencies) ? resp.currencies : [],
      supplierCategoriesMap: resp.supplierCategoriesMap || {},
    };
  }
}
