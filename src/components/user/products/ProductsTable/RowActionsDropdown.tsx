import React, { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, MoreHorizontal, Copy, Loader2, Store, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { ShopService } from "@/lib/shop-service";
import { ProductService, type Product } from "@/lib/product-service";
import type { ShopAggregated } from "@/lib/shop-service";

type ProductRow = Product & {
  linkedStoreIds?: string[];
  category_id?: number | null;
  category_external_id?: string | null;
  stock_quantity?: number | null;
  available?: boolean;
};

export function ProductActionsDropdown({ product, onEdit, onDelete, onDuplicate, onTrigger, canCreate, hideDuplicate, storeId, onStoresUpdate, storesList, prefetchStores, storeNames }: { product: ProductRow; onEdit: () => void; onDelete: () => void; onDuplicate?: () => void; onTrigger?: () => void; canCreate?: boolean; hideDuplicate?: boolean; storeId?: string; onStoresUpdate?: (productId: string, ids: string[], opts?: { storeIdChanged?: string; added?: boolean; categoryKey?: string | null }) => void; storesList?: ShopAggregated[]; prefetchStores?: () => Promise<void>; storeNames?: Record<string, string>; }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [stores, setStores] = useState<ShopAggregated[]>([]);
  const [linkedStoreIds, setLinkedStoreIds] = useState<string[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [togglingStoreIds, setTogglingStoreIds] = useState<string[]>([]);

  const loadStoresAndLinks = async () => {
    try {
      try { await prefetchStores?.(); } catch { void 0; }
      const cachedAgg = queryClient.getQueryData<ShopAggregated[]>(["shopsList"]) || [];
      if (cachedAgg.length > 0) {
        setStores(cachedAgg);
      } else {
        setLoadingStores(true);
        const data = await ShopService.getShopsAggregated();
        const arr = data || [];
        setStores(arr);
        try { queryClient.setQueryData<ShopAggregated[]>(["shopsList"], arr); } catch { void 0; }
        setLoadingStores(false);
      }
      ProductService.invalidateStoreLinksCache(String(product.id));
      const ids = await ProductService.getStoreLinksForProduct(product.id);
      setLinkedStoreIds(ids);
    } catch {
      const fallback = Array.isArray(storesList) && storesList.length > 0
        ? storesList
        : Object.entries(storeNames || {}).map(([id, name]) => ({ id: String(id), store_name: name })) as ShopAggregated[];
      setStores(fallback);
      setLinkedStoreIds(product.linkedStoreIds || []);
    }
  };

  useEffect(() => {
    if (Array.isArray(storesList) && storesList.length > 0) setStores(storesList);
  }, [storesList]);

  const [actionsOpen, setActionsOpen] = useState(false);
  return (
    <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Open row actions"
          onClick={() => { onTrigger?.(); }}
          data-testid="user_products_row_actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer" data-testid="user_products_row_edit">
          <Edit className="mr-2 h-4 w-4" />
          {t("edit")}
        </DropdownMenuItem>
        {hideDuplicate ? null : (
          <DropdownMenuItem onClick={onDuplicate} className="cursor-pointer" data-testid="user_products_row_duplicate" disabled={canCreate === false}>
            <Copy className="mr-2 h-4 w-4" />
            {t("duplicate")}
          </DropdownMenuItem>
        )}
        {storeId ? null : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger onClick={loadStoresAndLinks} data-testid={`user_products_row_stores_trigger_${product.id}`}>
              <Store className="h-4 w-4" />
              {t("menu_stores")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-1" data-testid={`user_products_row_stores_content_${product.id}`}>
              {((stores || []).length === 0 && loadingStores) ? (
                <DropdownMenuItem disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loading")}
                </DropdownMenuItem>
              ) : (
                (stores || []).length === 0 ? (
                  <DropdownMenuItem disabled>—</DropdownMenuItem>
                ) : (
                      (stores || []).map((s: ShopAggregated) => {
                        const id = String(s.id);
                        const initialLinked = Array.isArray(product.linkedStoreIds) ? (product.linkedStoreIds as string[]).map(String) : [];
                        const checked = initialLinked.includes(id) || linkedStoreIds.includes(id);
                        return (
                          <DropdownMenuItem
                            key={id}
                            className="cursor-pointer pr-2 pl-2 hover:bg-muted/60 focus:bg-muted/60"
                            onSelect={(e) => e.preventDefault()}
                            data-testid={`user_products_row_store_item_${product.id}_${id}`}
                          >
                            <div className="relative mr-2 inline-flex items-center justify-center" aria-busy={togglingStoreIds.includes(id)}>
                              <Checkbox
                                checked={checked}
                                disabled={togglingStoreIds.includes(id)}
                                onClick={(e) => e.stopPropagation()}
                                onCheckedChange={async (v) => {
                                  setTogglingStoreIds((prev) => Array.from(new Set([...prev, id])));
                                  try {
                                    if (v) {
                                      await ProductService.bulkAddStoreProductLinks([
                                            {
                                              product_id: String(product.id),
                                              store_id: String(id),
                                              is_active: true,
                                              custom_price: product.price ?? null,
                                              custom_price_old: product.price_old ?? null,
                                              custom_price_promo: product.price_promo ?? null,
                                              custom_stock_quantity: product.stock_quantity ?? null,
                                              custom_available: product.available ?? true,
                                            },
                                          ]);
                                          ProductService.invalidateStoreLinksCache(String(product.id));
                                          const fetched = await ProductService.getStoreLinksForProduct(product.id);
                                          setLinkedStoreIds(fetched);
                                          {
                                            const categoryKey = product.category_id != null ? `cat:${product.category_id}` : product.category_external_id ? `ext:${product.category_external_id}` : null;
                                            onStoresUpdate?.(product.id, fetched, { storeIdChanged: id, added: true, categoryKey });
                                            toast.success(t("product_added_to_store"));
                                            ShopService.bumpProductsCountInCache(String(id), 1);
                                        try { await ProductService.recomputeStoreCategoryFilterCache(String(id)); } catch { void 0; }
                                            try {
                                              queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
                                                const arr = Array.isArray(prev) ? prev : (stores || []);
                                                return (arr || []).map((s) => s.id === String(id) ? { ...s, productsCount: Math.max(0, ((s.productsCount ?? 0) + 1)) } : s);
                                              });
                                              const updated = queryClient.getQueryData<ShopAggregated[]>(["shopsList"]) || [];
                                              setStores(updated);
                                            } catch { void 0; }
                                          }
                                        } else {
                                          await ProductService.bulkRemoveStoreProductLinks([String(product.id)], [String(id)]);
                                          ProductService.invalidateStoreLinksCache(String(product.id));
                                          const fetched = await ProductService.getStoreLinksForProduct(product.id);
                                          setLinkedStoreIds(fetched);
                                          {
                                            const categoryKey = product.category_id != null ? `cat:${product.category_id}` : product.category_external_id ? `ext:${product.category_external_id}` : null;
                                            onStoresUpdate?.(product.id, fetched, { storeIdChanged: id, added: false, categoryKey });
                                            toast.success(t("product_removed_from_store"));
                                            ShopService.bumpProductsCountInCache(String(id), -1);
                                        try { await ProductService.recomputeStoreCategoryFilterCache(String(id)); } catch { void 0; }
                                            try {
                                              queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
                                                const arr = Array.isArray(prev) ? prev : (stores || []);
                                                return (arr || []).map((s) => s.id === String(id) ? { ...s, productsCount: Math.max(0, ((s.productsCount ?? 0) - 1)) } : s);
                                              });
                                              const updated = queryClient.getQueryData<ShopAggregated[]>(["shopsList"]) || [];
                                              setStores(updated);
                                            } catch { void 0; }
                                          }
                                        }
                                      } catch {
                                        toast.error(t("operation_failed"));
                                  } finally {
                                    setTogglingStoreIds((prev) => prev.filter((sid) => sid !== id));
                                    try { setActionsOpen(true); } catch { void 0; }
                                  }
                                    }}
                                    aria-label={t("select_store")}
                                  />
                              {togglingStoreIds.includes(id) ? (
                                <Loader2 className="absolute h-3 w-3 animate-spin text-emerald-600 pointer-events-none" />
                              ) : null}
                            </div>
                            <span className="truncate">{s.store_name || s.store_url || "—"}</span>
                          </DropdownMenuItem>
                        );
                      })
                    )
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer focus:text-destructive" data-testid="user_products_row_delete">
          <Trash2 className="mr-2 h-4 w-4" />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
