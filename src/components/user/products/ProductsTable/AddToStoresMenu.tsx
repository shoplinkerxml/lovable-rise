import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Store, Package, List, Loader2, Trash2, Plus } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { useQueryClient, QueryClient } from "@tanstack/react-query";
import { ShopService } from "@/lib/shop-service";
import { ProductService, type Product } from "@/lib/product-service";

type ProductRow = Product & { linkedStoreIds?: string[] };
type StoreAgg = { id: string; store_name?: string | null; store_url?: string | null; productsCount?: number; categoriesCount?: number };

export function AddToStoresMenu({
  open,
  setOpen,
  loadStoresForMenu,
  stores,
  setStores,
  selectedStoreIds,
  setSelectedStoreIds,
  items,
  table,
  removingStores,
  setRemovingStores,
  removingStoreId,
  setRemovingStoreId,
  queryClient,
  addingStores,
  setAddingStores,
  setProductsCached,
  setLastSelectedProductIds,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  loadStoresForMenu: () => Promise<void>;
  stores: StoreAgg[];
  setStores: (v: StoreAgg[]) => void;
  selectedStoreIds: string[];
  setSelectedStoreIds: Dispatch<SetStateAction<string[]>>;
  items: ProductRow[];
  table: import("@tanstack/react-table").Table<ProductRow>;
  removingStores: boolean;
  setRemovingStores: (v: boolean) => void;
  removingStoreId: string | null;
  setRemovingStoreId: (v: string | null) => void;
  queryClient: QueryClient;
  addingStores: boolean;
  setAddingStores: (v: boolean) => void;
  setProductsCached: (updater: (prev: ProductRow[]) => ProductRow[]) => void;
  setLastSelectedProductIds?: (ids: string[]) => void;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = queryClient || qc;

  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      try {
        await loadStoresForMenu();
      } catch (e) {
        setStores([]);
      }
    }
  }, [setOpen, loadStoresForMenu, setStores]);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={(table.getSelectedRowModel().rows.length === 0) && !((items as ProductRow[]).some((p) => Array.isArray(p.linkedStoreIds) && (p.linkedStoreIds.length > 0)))}
                aria-disabled={(table.getSelectedRowModel().rows.length === 0) && !((items as ProductRow[]).some((p) => Array.isArray(p.linkedStoreIds) && (p.linkedStoreIds.length > 0)))}
                aria-label={t("add_to_stores")}
                data-testid="user_products_dataTable_addToStores"
              >
                <Store className="h-4 w-4 text-foreground" />
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_addToStores">
            {t("add_to_stores")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="p-2" data-testid="user_products_addToStores_menu">
        <div className="text-sm mb-2">{t("select_stores")}</div>
        <ScrollArea className="max-h-[clamp(12rem,40vh,20rem)]">
          <div className="flex flex-col gap-1">
            {(stores || []).length === 0 ? (
              <div className="text-xs text-muted-foreground px-2 py-1">{t("no_active_stores")}</div>
            ) : (
              (stores || []).map((s: StoreAgg) => {
                const id = String(s.id);
                const checked = selectedStoreIds.includes(id);
                const countInStore = (items as ProductRow[]).reduce((acc, p) => {
                  const links = (p.linkedStoreIds || []).map(String);
                  return acc + (links.includes(id) ? 1 : 0);
                }, 0);
                const aggProducts = typeof s.productsCount === 'number' ? s.productsCount : 0;
                const aggCategories = typeof s.categoriesCount === 'number' ? (s.categoriesCount as number) : 0;
                return (
                  <DropdownMenuItem
                    key={id}
                    className="cursor-pointer pr-2 pl-2"
                    onSelect={(e) => {
                      e.preventDefault();
                      const next = checked
                        ? selectedStoreIds.filter((v) => v !== id)
                        : Array.from(new Set([...selectedStoreIds, id]));
                      setSelectedStoreIds(next);
                    }}
                    data-testid={`user_products_addToStores_item_${id}`}
                  >
                    <div className="relative mr-2 inline-flex items-center justify-center" aria-busy={removingStores || removingStoreId === id}>
                      <Checkbox
                        checked={checked}
                        disabled={removingStores || removingStoreId === id}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={(v) => {
                          const next = v
                            ? Array.from(new Set([...selectedStoreIds, id]))
                            : selectedStoreIds.filter((x) => x !== id);
                          setSelectedStoreIds(next);
                        }}
                        className="mr-2"
                        aria-label={t("select_store")}
                      />
                      {(removingStores || removingStoreId === id) ? (
                        <Loader2 className="absolute h-3 w-3 animate-spin text-emerald-600 pointer-events-none" />
                      ) : null}
                    </div>
                    <span className="truncate">{s.store_name || s.store_url || "—"}</span>
                    <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span className="tabular-nums">{aggProducts}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <List className="h-3 w-3" />
                        <span className="tabular-nums">{aggCategories}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={removingStores || removingStoreId === id || !checked || countInStore === 0}
                        aria-disabled={removingStores || removingStoreId === id || !checked || countInStore === 0}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (countInStore === 0) return;
                          const selected = table.getSelectedRowModel().rows.map((r) => r.original).filter(Boolean) as ProductRow[];
                          const productIds = Array.from(new Set(selected
                            .filter((p) => (p.linkedStoreIds || []).map(String).includes(id))
                            .map((p) => String(p.id))
                            .filter(Boolean)));
                          setRemovingStoreId(id);
                          try {
                            const { deletedByStore } = await ProductService.bulkRemoveStoreProductLinks(productIds, [id]);
                            {
                              toast.success(t('product_removed_from_store'));
                              const updateItems = (prev: ProductRow[]) => {
                                if (productIds.length > 0) {
                                  return prev.map((p) => {
                                    const pid = String(p.id);
                                    if (!productIds.includes(pid)) return p;
                                    const nextIds = (p.linkedStoreIds || []).filter((sid) => String(sid) !== id);
                                    return { ...p, linkedStoreIds: nextIds };
                                  });
                                }
                                return prev.map((p) => {
                                  const nextIds = (p.linkedStoreIds || []).filter((sid) => String(sid) !== id);
                                  return { ...p, linkedStoreIds: nextIds };
                                });
                              };
                              try { /* parent should handle setItems; noop here */ } catch { void 0; }
                              try {
                                const dec = deletedByStore?.[String(id)] ?? countInStore;
                                if (dec > 0) ShopService.bumpProductsCountInCache(String(id), -dec);
                                try {
                                  await ProductService.recomputeStoreCategoryFilterCache(String(id));
                                  try {
                                    const key = `rq:filters:categories:${String(id)}`;
                                    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
                                    if (raw) {
                                      const parsed = JSON.parse(raw) as { items?: string[] };
                                      const cnt = Array.isArray(parsed?.items) ? parsed.items.length : 0;
                                      ShopService.setCategoriesCountInCache(String(id), cnt);
                                      try {
                                        q.setQueryData<StoreAgg[]>(['shopsList'], (prev) => {
                                          const arr = Array.isArray(prev) ? prev : (stores || []);
                                          const idStr = String(id);
                                          return (arr || []).map((s0) => s0.id === idStr ? { ...s0, categoriesCount: Math.max(0, Number(cnt) || 0) } : s0);
                                        });
                                        const updatedCats = (q.getQueryData<StoreAgg[]>(['shopsList']) || []) as StoreAgg[];
                                        setStores(updatedCats);
                                      } catch { void 0; }
                                    }
                                  } catch { void 0; }
                                } catch { void 0; }
                                try {
                                  q.setQueryData<StoreAgg[]>(['shopsList'], (prev) => {
                                    const arr = Array.isArray(prev) ? prev : (stores || []);
                                    const idStr = String(id);
                                    const nextDec = dec > 0 ? dec : 0;
                                    return (arr || []).map((s0) => s0.id === idStr ? { ...s0, productsCount: Math.max(0, ((s0.productsCount ?? 0) - nextDec)) } : s0);
                                  });
                                  const updated = (q.getQueryData<StoreAgg[]>(['shopsList']) || []) as StoreAgg[];
                                  setStores(updated);
                                } catch { void 0; }
                              } catch { void 0; }
                              try {
                                const idStr = String(id);
                                const decUi = deletedByStore?.[idStr] ?? (productIds.length > 0 ? productIds.length : countInStore);
                                const nextCount = Math.max(0, countInStore - decUi);
                                if (nextCount === 0) setSelectedStoreIds((prev) => prev.filter((v) => v !== idStr));
                              } catch { void 0; }
                            }
                          } catch (e) {
                            toast.error(t('failed_remove_from_store'));
                          } finally {
                            setRemovingStoreId(null);
                            try { table.resetRowSelection(); } catch { /* ignore */ }
                          }
                        }}
                      >
                        {removingStoreId === id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </span>
                  </DropdownMenuItem>
                );
              })
            )}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator />
        {(() => {
          const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original) as ProductRow[];
          const hasLinkedInSelectedStores = (() => {
            if (selectedStoreIds.length === 0 || selectedRows.length === 0) return false;
            const set = new Set(selectedStoreIds.map(String));
            for (const p of selectedRows) {
              const links = (p.linkedStoreIds || []).map(String);
              for (const sid of links) { if (set.has(sid)) return true; }
            }
            return false;
          })();
          const isAnyProductSelected = selectedRows.length > 0;
          const totalLinksInSelectedProducts = selectedRows.reduce((acc, p) => acc + ((p.linkedStoreIds || []).length), 0);
          const totalInSelectedStores = selectedStoreIds.reduce((acc, sid) => {
            const count = (items as ProductRow[]).reduce((inner, p) => {
              const links = (p.linkedStoreIds || []).map(String);
              return inner + (links.includes(String(sid)) ? 1 : 0);
            }, 0);
            return acc + count;
          }, 0);
          const effectiveStoreIds = selectedStoreIds.length > 0
            ? Array.from(new Set(selectedStoreIds))
            : Array.from(new Set(selectedRows.flatMap((p) => (p.linkedStoreIds || []).map(String))));
          const disableDelete = removingStores
            || (!isAnyProductSelected && selectedStoreIds.length === 0)
            || (effectiveStoreIds.length === 0)
            || (selectedStoreIds.length > 0 ? totalInSelectedStores === 0 : totalLinksInSelectedProducts === 0);
          return (
            <div className="flex items-center justify-center gap-2 w-full">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={addingStores || selectedStoreIds.length === 0 || !isAnyProductSelected}
                aria-disabled={addingStores || selectedStoreIds.length === 0 || !isAnyProductSelected}
                onClick={async () => {
                  const selected = table.getSelectedRowModel().rows.map((r) => r.original).filter(Boolean) as ProductRow[];
                  const storeIds = Array.from(new Set(selectedStoreIds));
                  const productIds = Array.from(new Set(selected.map((p) => String(p.id)).filter(Boolean)));
                  if (productIds.length === 0 || storeIds.length === 0) return;
                  setAddingStores(true);
                  try {
                    const payload: Array<{ product_id: string; store_id: string; is_active?: boolean; custom_price?: number | null; custom_price_old?: number | null; custom_price_promo?: number | null; custom_stock_quantity?: number | null; custom_available?: boolean | null }> = [];
                    for (const p of selected) {
                      const pid = String(p.id);
                      const linksSet = new Set((p.linkedStoreIds || []).map(String));
                      for (const sid of storeIds) {
                        if (linksSet.has(String(sid))) continue;
                        payload.push({ product_id: pid, store_id: sid, is_active: true, custom_price: p.price ?? null, custom_price_old: p.price_old ?? null, custom_price_promo: p.price_promo ?? null, custom_stock_quantity: p.stock_quantity ?? null, custom_available: p.available ?? true });
                      }
                    }
                    const toInsert = payload;
                    const { inserted, addedByStore } = await ProductService.bulkAddStoreProductLinks(toInsert);
                    if (inserted === 0) {
                      toast.success(t('products_already_linked'));
                    } else {
                      {
                        toast.success(t('product_added_to_stores'));
                        setProductsCached((prev) => prev.map((p) => {
                          const pid = String(p.id);
                          if (!productIds.includes(pid)) return p;
                          const merged = Array.from(new Set([...(p.linkedStoreIds || []), ...storeIds.map(String)]));
                          return { ...p, linkedStoreIds: merged };
                        }));
                        try {
                          Object.entries(addedByStore).forEach(([sid, cnt]) => { if (cnt > 0) ShopService.bumpProductsCountInCache(String(sid), cnt); });
                          const storesUnique = Array.from(new Set(storeIds.map(String)));
                          for (const sid of storesUnique) { try { await ProductService.recomputeStoreCategoryFilterCache(String(sid)); } catch { void 0; } }
                          q.invalidateQueries({ queryKey: ['shopsList'] });
                        } catch { void 0; }
                      }
                    }
                  } catch (e) {
                    toast.error(t('failed_add_product_to_stores'));
                  } finally {
                    setAddingStores(false);
                    try { table.resetRowSelection(); } catch { void 0; }
                    try { setLastSelectedProductIds?.(productIds); } catch { void 0; }
                  }
                }}
                data-testid="user_products_addToStores_confirm"
              >
                {addingStores ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${isAnyProductSelected ? 'border border-green-500' : ''}`}
                      disabled={disableDelete}
                      aria-disabled={disableDelete}
                      onClick={async () => {
                        const selected = table.getSelectedRowModel().rows.map((r) => r.original).filter(Boolean) as ProductRow[];
                        const productIds = Array.from(new Set(selected.map((p) => String(p.id)).filter(Boolean)));
                        const storeIds = effectiveStoreIds;
                        if (storeIds.length === 0) return;
                        setRemovingStores(true);
                        try {
                          const { deletedByStore } = await ProductService.bulkRemoveStoreProductLinks(productIds, storeIds);
                          {
                            toast.success(t('product_removed_from_store'));
                            try {
                              const countsByStore: Record<string, number> = {};
                              if (productIds.length > 0) {
                                for (const sid of storeIds) {
                                  countsByStore[String(sid)] = 0;
                                  for (const p of selected) {
                                    const ids = (p.linkedStoreIds || []).map(String);
                                    if (ids.includes(String(sid))) countsByStore[String(sid)] += 1;
                                  }
                                }
                              } else {
                                Object.assign(countsByStore, deletedByStore);
                              }
                              Object.entries(countsByStore).forEach(([sid, cnt]) => { if (cnt > 0) ShopService.bumpProductsCountInCache(String(sid), -cnt); });
                              for (const sid of storeIds) { try { await ProductService.recomputeStoreCategoryFilterCache(String(sid)); } catch { void 0; } }
                              try {
                                for (const sid of storeIds) {
                                  const key = `rq:filters:categories:${String(sid)}`;
                                  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
                                  if (raw) {
                                    const parsed = JSON.parse(raw) as { items?: string[] };
                                    const cnt = Array.isArray(parsed?.items) ? parsed.items.length : 0;
                                    ShopService.setCategoriesCountInCache(String(sid), cnt);
                                    try {
                                      q.setQueryData<StoreAgg[]>(['shopsList'], (prev) => {
                                        const arr = Array.isArray(prev) ? prev : (stores || []);
                                        const sidStr = String(sid);
                                        return (arr || []).map((s0) => s0.id === sidStr ? { ...s0, categoriesCount: Math.max(0, Number(cnt) || 0) } : s0);
                                      });
                                    } catch { void 0; }
                                  }
                                }
                              } catch { void 0; }
                              try {
                                q.setQueryData<StoreAgg[]>(['shopsList'], (prev) => {
                                  const arr = Array.isArray(prev) ? prev : (stores || []);
                                  const mapDec = new Map(Object.entries(countsByStore));
                                  return (arr || []).map((s0) => {
                                    const dec = Number(mapDec.get(String(s0.id)) ?? 0);
                                    return dec > 0 ? { ...s0, productsCount: Math.max(0, ((s0.productsCount ?? 0) - dec)) } : s0;
                                  });
                                });
                                const updated = (q.getQueryData<StoreAgg[]>(['shopsList']) || []) as StoreAgg[];
                                setStores(updated);
                              } catch { void 0; }
                              q.invalidateQueries({ queryKey: ['shopsList'] });
                            } catch { void 0; }
                          }
                        } catch (e) {
                          toast.error(t('failed_remove_from_store'));
                        } finally {
                          setRemovingStores(false);
                          try { table.resetRowSelection(); } catch { void 0; }
                        }
                      }}
                      data-testid="user_products_addToStores_delete"
                    >
                      {removingStores ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {isAnyProductSelected ? 'Видалити виділені товари з вибраних магазинів' : 'Видалити всі товари з вибраних магазинів'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
