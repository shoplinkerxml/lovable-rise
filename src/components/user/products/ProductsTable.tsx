import React, { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DialogNoOverlay,
  DialogNoOverlayContent,
  DialogNoOverlayDescription,
  DialogNoOverlayFooter,
  DialogNoOverlayHeader,
  DialogNoOverlayTitle,
} from "@/components/ui/dialog-no-overlay";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { format } from "date-fns";
import { Edit, MoreHorizontal, Package, Trash2, Columns as ColumnsIcon, Plus, Copy, Loader2, ChevronDown, ChevronUp, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Store } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { ProductService, type Product } from "@/lib/product-service";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ProductsTableProps = {
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => Promise<void> | void;
  onCreateNew?: () => void;
  onProductsLoaded?: (count: number) => void;
  onLoadingChange?: (loading: boolean) => void;
  refreshTrigger?: number;
  canCreate?: boolean;
  storeId?: string;
  hideDuplicate?: boolean;
};

const LoadingSkeleton = () => (
  <TableRow className="hover:bg-muted/50">
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="h-[clamp(1.75rem,3vw,2.5rem)] w-[clamp(1.75rem,3vw,2.5rem)] rounded-md bg-muted animate-pulse" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-[clamp(6rem,20vw,12rem)] bg-muted rounded animate-pulse"></div>
          <div className="h-3 w-[clamp(8rem,24vw,14rem)] bg-muted rounded animate-pulse mt-1 hidden sm:block"></div>
        </div>
      </div>
    </TableCell>
    <TableCell>
      <div className="h-6 w-16 bg-muted rounded-full animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
    </TableCell>
    <TableCell className="text-right">
      <div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div>
    </TableCell>
  </TableRow>
);

function ProductStatusBadge({ state }: { state?: string }) {
  const { t } = useI18n();
  const s = state || 'new';
  const labelKey =
    s === 'stock' ? 'status_stock' :
    s === 'used' ? 'status_used' :
    s === 'refurbished' ? 'status_refurbished' : 'status_new';

  const isPrimary = s === 'new' || s === 'refurbished';
  return (
    <Badge
      variant={isPrimary ? 'default' : 'secondary'}
      className={
        isPrimary
          ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/10'
          : 'bg-muted/50 text-muted-foreground border-muted hover:bg-muted/50'
      }
    >
      {t(labelKey)}
    </Badge>
  );
}

function ProductActionsDropdown({ product, onEdit, onDelete, onDuplicate, onTrigger, canCreate, hideDuplicate, storeId }: { product: ProductRow; onEdit: () => void; onDelete: () => void; onDuplicate?: () => void; onTrigger?: () => void; canCreate?: boolean; hideDuplicate?: boolean; storeId?: string }) {
  const { t } = useI18n();
  const [stores, setStores] = useState<any[]>([]);
  const [linkedStoreIds, setLinkedStoreIds] = useState<string[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  const loadStoresAndLinks = async () => {
    if (loadingStores) return;
    setLoadingStores(true);
    try {
      const data = await ProductService.getUserStores();
      setStores(data || []);
      const { data: links } = await (supabase as any)
        .from('store_product_links')
        .select('store_id')
        .eq('product_id', product.id);
      const ids = (links || []).map((r: any) => String(r.store_id));
      setLinkedStoreIds(ids);
    } catch (_) {
      setStores([]);
      setLinkedStoreIds([]);
    } finally {
      setLoadingStores(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="Open row actions"
          onClick={() => {
            // При открытии меню действий считаем строку выбранной
            onTrigger?.();
          }}
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
          <DropdownMenuSubTrigger onPointerEnter={loadStoresAndLinks} data-testid={`user_products_row_stores_trigger_${product.id}`}>
            <Store className="h-4 w-4" />
            {t("menu_stores")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-1" data-testid={`user_products_row_stores_content_${product.id}`}>
            {loadingStores ? (
              <DropdownMenuItem disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </DropdownMenuItem>
            ) : (
              (stores || []).length === 0 ? (
                <DropdownMenuItem disabled>—</DropdownMenuItem>
              ) : (
                (stores || []).map((s: any) => {
                  const id = String(s.id);
                  const checked = linkedStoreIds.includes(id);
                  return (
                    <DropdownMenuItem
                      key={id}
                      className="cursor-pointer pr-2 pl-2"
                      onSelect={(e) => e.preventDefault()}
                      data-testid={`user_products_row_store_item_${product.id}_${id}`}
                    >
                      <Checkbox
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={async (v) => {
                          try {
                            if (v) {
                              const { data: existing } = await (supabase as any)
                                .from('store_product_links')
                                .select('product_id,store_id')
                                .eq('product_id', product.id)
                                .eq('store_id', id)
                                .maybeSingle();
                              let error: any = null;
                              if (!existing) {
                                const res = await (supabase as any)
                                  .from('store_product_links')
                                  .insert([
                                    {
                                      product_id: product.id,
                                      store_id: id,
                                      is_active: true,
                                      custom_price: (product as any).price ?? null,
                                      custom_price_old: (product as any).price_old ?? null,
                                      custom_price_promo: (product as any).price_promo ?? null,
                                      custom_stock_quantity: (product as any).stock_quantity ?? null,
                                    },
                                  ])
                                  .select('*');
                                error = res.error;
                              }
                              if (!error) {
                                setLinkedStoreIds((prev) => Array.from(new Set([...prev, id])));
                                toast.success(t('product_added_to_store'));
                              } else {
                                toast.error(t('failed_add_to_store'));
                              }
                            } else {
                              const { error } = await (supabase as any)
                                .from('store_product_links')
                                .delete()
                                .eq('product_id', product.id)
                                .eq('store_id', id);
                              if (!error) {
                                setLinkedStoreIds((prev) => prev.filter((x) => x !== id));
                                toast.success(t('product_removed_from_store'));
                              } else {
                                toast.error(t('failed_remove_from_store'));
                              }
                            }
                          } catch (_) {
                            toast.error(t('operation_failed'));
                          }
                        }}
                        className="mr-2"
                        aria-label={t('select_store')}
                      />
                      <span className="truncate">{s.store_name || s.store_url || id}</span>
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

type ProductRow = Product & {
  mainImageUrl?: string;
  categoryName?: string;
  supplierName?: string;
};

export const ProductsTable = ({
  onEdit,
  onDelete,
  onCreateNew,
  onProductsLoaded,
  onLoadingChange,
  refreshTrigger,
  canCreate,
  storeId,
  hideDuplicate,
}: ProductsTableProps) => {
  const { t } = useI18n();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  const [copyDialog, setCopyDialog] = useState<{ open: boolean; name: string | null }>({
    open: false,
    name: null,
  });

  const productsCount = products.length;

  useEffect(() => {
    loadProducts();
  }, [refreshTrigger]);

  const loadProducts = async () => {
    setLoading(true);
    onLoadingChange?.(true);
    try {
      const data = storeId ? await ProductService.getProductsForStore(storeId) : await ProductService.getProducts();
      onProductsLoaded?.(data.length);

      const ids = (data ?? []).map((p) => p.id).filter(Boolean) as string[];
      const categoryIds = (data ?? [])
        .map((p: any) => p.category_id)
        .filter((v) => !!v);

      const mainImageMap: Record<string, string> = {};
      const categoryNameMap: Record<string, string> = {};

      if (ids.length > 0) {
        // Загружаем все изображения товаров и выбираем главное:
        // приоритет is_main=true, иначе самое раннее по order_index
        const { data: imgRows } = await (supabase as any)
          .from('store_product_images')
          .select('product_id,url,is_main,order_index')
          .in('product_id', ids);
        const grouped: Record<string, any[]> = {};
        (imgRows ?? []).forEach((r: any) => {
          const pid = String(r.product_id);
          if (!grouped[pid]) grouped[pid] = [];
          grouped[pid].push(r);
        });
        Object.entries(grouped).forEach(([pid, rows]) => {
          const main = rows.find((x) => x.is_main) || rows.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))[0];
          if (main?.url) {
            mainImageMap[pid] = main.url;
          }
        });
      }

      if (categoryIds.length > 0) {
        const { data: catRows } = await (supabase as any)
          .from('store_categories')
          .select('id,name')
          .in('id', categoryIds);
        (catRows ?? []).forEach((r: any) => {
          if (r.id && r.name) {
            categoryNameMap[String(r.id)] = r.name;
          }
        });
      }

      // Resolve names by external_id when category_id is missing or not mapped
      const externalCategoryIds = (data ?? [])
        .map((p: any) => p.category_external_id)
        .filter((v) => !!v);
      if (externalCategoryIds.length > 0) {
        const { data: extCatRows } = await (supabase as any)
          .from('store_categories')
          .select('external_id,name')
          .in('external_id', externalCategoryIds);
        (extCatRows ?? []).forEach((r: any) => {
          if (r.external_id && r.name) {
            categoryNameMap[String(r.external_id)] = r.name;
          }
        });
      }

      // Map supplier_id → supplier_name
      const supplierIdsRaw = (data ?? [])
        .map((p: any) => p.supplier_id)
        .filter((v) => v !== null && v !== undefined);
      const supplierIds = Array.from(new Set(supplierIdsRaw));
      const supplierNameMap: Record<string | number, string> = {};
      if (supplierIds.length > 0) {
        const { data: supRows } = await (supabase as any)
          .from('user_suppliers')
          .select('id,supplier_name')
          .in('id', supplierIds as any);
        (supRows ?? []).forEach((r: any) => {
          if (r.id != null && r.supplier_name) {
            supplierNameMap[r.id] = r.supplier_name;
          }
        });
      }

      const augmented = (data ?? []).map((p: any) => ({
        ...p,
        mainImageUrl: p.id ? mainImageMap[String(p.id)] : undefined,
        categoryName:
          (p.category_id && categoryNameMap[String(p.category_id)]) ||
          (p.category_external_id && categoryNameMap[String(p.category_external_id)]) ||
          undefined,
        supplierName:
          (p.supplier_id != null && supplierNameMap[p.supplier_id]) ||
          undefined,
      }));

      setProducts(augmented as ProductRow[]);
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  // Дублирование товара и обновление таблицы
  const handleDuplicate = async (product: Product) => {
    try {
      if (canCreate === false) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
        return;
      }
      const nameForUi = product.name_ua || product.name || product.external_id || product.id;
      setCopyDialog({ open: true, name: nameForUi });
      await ProductService.duplicateProduct(product.id);
      await loadProducts();
    } catch (error) {
      console.error("Duplicate product failed", error);
      const msg = String((error as any)?.message || '');
      if (msg.toLowerCase().includes('ліміт') || msg.toLowerCase().includes('limit')) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
      } else {
        toast.error(t('failed_duplicate_product'));
      }
    } finally {
      setCopyDialog({ open: false, name: null });
    }
  };

  const rows = useMemo(() => products, [products]);

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  // Persisted column visibility (hide vendor/short name/description by default)
  const COLUMN_VIS_KEY = "user_products_columnVisibility";
  const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
    select: true,
    created_at: false,
    supplier: true,
    vendor: false,
    available: false,
    docket_ua: false,
    description_ua: false,
    price_old: false,
    price_promo: false,
  };
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_COLUMN_VISIBILITY);
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(COLUMN_VIS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge to ensure newly added defaults are respected
        setColumnVisibility((prev) => ({ ...DEFAULT_COLUMN_VISIBILITY, ...(parsed || {}) }));
      } else {
        // Ensure defaults applied when nothing persisted
        setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
      }
    } catch (_) {
      // If parsing fails, keep defaults
      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    }
  }, []);
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(COLUMN_VIS_KEY, JSON.stringify(columnVisibility));
      }
    } catch (_) {
      // ignore write errors
    }
  }, [columnVisibility]);
  // Default column order: photo → article → category → name → price → quantity → status → actions
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "select",
    "photo",
    "article",
    "category",
    "name_ua",
    "docket_ua",
    "description_ua",
    "price",
    "price_old",
    "price_promo",
    "stock_quantity",
    "vendor",
    "status",
    "supplier",
    "created_at",
    "actions",
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  // Управляемое состояние открытия меню колонок: не закрывать по клику внутри
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [storesMenuOpen, setStoresMenuOpen] = useState(false);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [addingStores, setAddingStores] = useState(false);
  const [removingStores, setRemovingStores] = useState(false);

  useEffect(() => {
    setColumnOrder((prev) => {
      const withoutActive = prev.filter((id) => id !== "active");
      const withoutActions = withoutActive.filter((id) => id !== "actions");
      if (storeId) {
        return [...withoutActions, "active", "actions"];
      }
      return [...withoutActions, "actions"];
    });
  }, [storeId]);

  // Toggle sort control rendered as native button with inline SVG icon
  function SortToggle({ column, table }: { column: any; table: any }) {
    const { t } = useI18n();
    const cur = column.getIsSorted?.(); // false | 'asc' | 'desc'
    const isActive = cur === "asc" || cur === "desc";
    return (
      <button
        type="button"
        className={`h-8 w-4 p-0 inline-flex items-center justify-center rounded-md hover:bg-muted ${isActive ? "text-primary" : "text-foreground"}`}
        aria-label={t("sort_asc")}
        onClick={() => {
          const next = cur === false ? "asc" : cur === "asc" ? "desc" : "asc";
          table.setSorting([{ id: column.id, desc: next === "desc" }]);
        }}
        data-testid={`user_products_sort_${column.id}_toggle`}
      >
        {/* arrow-up-down icon (lucide) as inline SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-down h-4 w-4">
          <path d="m21 16-4 4-4-4"></path>
          <path d="M17 20V4"></path>
          <path d="m3 8 4-4 4 4"></path>
          <path d="M7 4v16"></path>
        </svg>
      </button>
    );
  }

  function ColumnFilterMenu({ column }: { column: any }) {
    const { t } = useI18n();
    const [query, setQuery] = useState("");
    const faceted = column.getFacetedUniqueValues?.();
    const values = faceted ? Array.from(faceted.keys()) : [];
    // Normalize current filter to an array for multi-select
    const currentFilter = column.getFilterValue?.();
    const selectedValues: string[] = Array.isArray(currentFilter)
      ? currentFilter.map((v: any) => (v == null ? "" : String(v)))
      : currentFilter
      ? [String(currentFilter)]
      : [];
    const filteredValues = values
      .map((v) => (typeof v === "string" ? v : v == null ? "" : String(v)))
      .filter((v) => (query ? v.toLowerCase().includes(query.toLowerCase()) : true))
      .sort((a, b) => a.localeCompare(b));

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-4 p-0"
            aria-label={t("filter")}
            data-testid={`user_products_filter_trigger_${column.id}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[12rem] w-fit p-2"
          data-testid={`user_products_filter_menu_${column.id}`}
        >
          <div className="mb-2">
            <Input
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full"
              data-testid={`user_products_filter_search_${column.id}`}
            />
          </div>
          <ScrollArea className="max-h-[clamp(12rem,40vh,20rem)]">
            <div className="flex flex-col">
              {filteredValues.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2 py-1">{t("no_results")}</div>
              ) : (
                filteredValues.map((val) => {
                  const isChecked = selectedValues.includes(val);
                  return (
                    <DropdownMenuItem
                      key={val}
                      className="cursor-pointer pr-2 pl-2"
                      onSelect={(e) => {
                        e.preventDefault();
                        const next = isChecked
                          ? selectedValues.filter((v) => v !== val)
                          : Array.from(new Set([...selectedValues, val]));
                        column.setFilterValue(next);
                      }}
                      data-testid={`user_products_filter_item_${column.id}_${val}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? Array.from(new Set([...selectedValues, val]))
                            : selectedValues.filter((v) => v !== val);
                          column.setFilterValue(next);
                        }}
                        className="mr-2"
                        aria-label={t("select_row")}
                        data-testid={`user_products_filter_checkbox_${column.id}_${val}`}
                      />
                      <span className="truncate">{val || "—"}</span>
                    </DropdownMenuItem>
                  );
                })
              )}
          </div>
        </ScrollArea>
          <DropdownMenuSeparator />
          <Button
            variant="outline"
            className="w-full h-8 mt-2"
            onClick={() => column.setFilterValue(undefined)}
            data-testid={`user_products_filter_clear_${column.id}`}
          >
            {t("clear")}
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Динамическая ширина колонки названия: уменьшается по мере добавления видимых столбцов
  const dynamicNameMaxVW = useMemo(() => {
    // Список колонок, которые визуально отнимают место у названия
    const spaceConsumers = [
      "status",
      "supplier",
      "price",
      "price_old",
      "price_promo",
      "category",
      "stock_quantity",
      "created_at",
      "article",
      "vendor",
      "docket_ua",
      "description_ua",
      "photo",
      "select",
      "active",
      "actions",
    ];
    // Базовое значение vw для названия и шаг уменьшения
    const baseVW = 28; // при минимуме столбцов
    const stepVW = 2;  // уменьшаем на 2vw за каждый добавленный столбец
    const minVW = 12;  // нижняя граница, чтобы название оставалось читаемым

    const visibleCount = spaceConsumers.reduce((acc, id) => acc + (columnVisibility[id] ? 1 : 0), 0);
    const computed = Math.max(minVW, baseVW - visibleCount * stepVW);
    return computed;
  }, [columnVisibility]);

  const columns = useMemo<ColumnDef<ProductRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-start">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t("select_all")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-start">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("select_row")}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },
    {
      id: "photo",
      header: t("photo"),
      enableSorting: false,
      enableColumnFilter: false,
      size: 56,
      cell: ({ row }) => {
        const product = row.original;
        const img = product.mainImageUrl;
        const initials = (product.name || product.name_ua || "?")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        return (
          <div className="flex items-center justify-start" data-testid="user_products_photo">
            <Avatar className="h-[clamp(1.75rem,3vw,2.5rem)] w-[clamp(1.75rem,3vw,2.5rem)] rounded-md">
              {img ? (
                <AvatarImage src={img} alt={product.name_ua || product.name || ""} />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary rounded-md">{initials}</AvatarFallback>
              )}
            </Avatar>
          </div>
        );
      },
    },
    {
      id: "name_ua",
      accessorFn: (row) => row.name_ua ?? row.name ?? "",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("table_product")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const product = row.original;
        const name = product.name_ua || product.name || "—";
        return (
          <div className="min-w-0 max-w-full" data-testid="user_products_name">
            <div className="font-medium break-words line-clamp-2 w-full" title={name}>
              {name}
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      accessorFn: (row) => row.state ?? "",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("table_status")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => (
        <ProductStatusBadge state={row.original.state} />
      ),
      enableHiding: true,
    },
    {
      id: "supplier",
      accessorFn: (row) => row.supplierName ?? "",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("supplier")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const name = (row.original as any).supplierName;
        return name ? (
          <span className="text-sm" data-testid="user_products_supplier">{name}</span>
        ) : (
          <span className="text-muted-foreground" data-testid="user_products_supplier_empty">—</span>
        );
      },
      enableHiding: true,
    },
    {
      id: "price",
      accessorFn: (row) => (typeof row.price === "number" ? row.price : Number.NEGATIVE_INFINITY),
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("table_price")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const p = row.original as any;
        const currency = p.currency_code || "";
        return row.original.price != null ? (
          <span className="tabular-nums">{row.original.price} {currency}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "price_old",
      accessorFn: (row) => (typeof row.price_old === "number" ? row.price_old : Number.NEGATIVE_INFINITY),
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("old_price")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const p = row.original as any;
        const currency = p.currency_code || "";
        return row.original.price_old != null ? (
          <span className="tabular-nums" data-testid="user_products_priceOld">{row.original.price_old} {currency}</span>
        ) : (
          <span className="text-muted-foreground" data-testid="user_products_priceOld_empty">—</span>
        );
      },
      enableHiding: true,
    },
    {
      id: "price_promo",
      accessorFn: (row) => (typeof row.price_promo === "number" ? row.price_promo : Number.NEGATIVE_INFINITY),
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("promo_price")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const p = row.original as any;
        const currency = p.currency_code || "";
        return row.original.price_promo != null ? (
          <span className="tabular-nums" data-testid="user_products_pricePromo">{row.original.price_promo} {currency}</span>
        ) : (
          <span className="text-muted-foreground" data-testid="user_products_pricePromo_empty">—</span>
        );
      },
      enableHiding: true,
    },
    {
      id: "category",
      accessorFn: (row) => row.categoryName ?? "",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("category")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const name = row.original.categoryName;
        return name ? <span className="text-sm">{name}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "stock_quantity",
      accessorFn: (row) => (typeof row.stock_quantity === "number" ? row.stock_quantity : Number.NEGATIVE_INFINITY),
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("table_stock")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => (
        row.original.stock_quantity != null ? (
          <span className="tabular-nums">{row.original.stock_quantity}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      enableHiding: true,
    },
    {
      id: "created_at",
      accessorFn: (row) => {
        const v = row.created_at;
        try { return v ? new Date(v).getTime() : 0; } catch { return 0; }
      },
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("table_created")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => (
        row.original.created_at ? (
          <div className="flex flex-col">
            <span className="tabular-nums">{format(new Date(row.original.created_at), "yyyy-MM-dd")}</span>
            <span className="text-muted-foreground hidden sm:block tabular-nums">
              {format(new Date(row.original.created_at), "HH:mm")}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      enableHiding: true,
    },
    // Дополнительные колонки (видимы по опциям) — ставим их ДО действий
    {
      accessorKey: "article",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("article")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.article || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "vendor",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("vendor")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => <span className="text-sm text-foreground">{(row.original as any).vendor || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "docket_ua",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("short_name_ua")}</span>
          <div className="flex items-center gap-0 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const shortName = (row.original as any).docket_ua || "";
        return (
          <div
            className="text-sm text-foreground max-w-[clamp(8rem,20vw,16rem)] truncate"
            title={shortName}
            data-testid="user_products_docketUa"
          >
            {shortName}
          </div>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "description_ua",
      filterFn: (row, id, value) => {
        const rv = row.getValue(id);
        const str = rv == null ? "" : String(rv);
        if (value == null) return true;
        if (Array.isArray(value)) return value.map((v: any) => String(v)).includes(str);
        return str.toLowerCase().includes(String(value).toLowerCase());
      },
      header: ({ column, table }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("product_description_ua")}</span>
          <div className="flex items-center gap-1 ml-auto">
            <SortToggle column={column} table={table} />
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      cell: ({ row }) => {
        const desc = (row.original as any).description_ua || "";
        return (
          <div
            className="text-sm text-foreground max-w-[clamp(10rem,22vw,18rem)] line-clamp-2 break-words"
            title={desc}
            data-testid="user_products_descriptionUa"
          >
            {desc}
          </div>
        );
      },
      enableHiding: true,
    },
    {
      id: "actions",
      header: t("table_actions"),
      enableSorting: false,
      enableHiding: false,
      size: 96,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <ProductActionsDropdown
            product={row.original}
            onEdit={() => onEdit?.(row.original)}
            onDelete={() => setDeleteDialog({ open: true, product: row.original })}
            onDuplicate={() => handleDuplicate(row.original)}
            onTrigger={() => row.toggleSelected(true)}
            canCreate={canCreate}
            hideDuplicate={hideDuplicate}
            storeId={storeId}
          />
        </div>
      ),
    },
    ...(storeId ? [{
      id: "active",
      header: t("table_active"),
      enableSorting: false,
      enableHiding: false,
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Switch
            checked={!!(row.original as any).available}
            onCheckedChange={async (checked) => {
              try {
                setProducts((prev) => prev.map((p) => p.id === row.original.id ? { ...p, available: checked } : p));
                await ProductService.updateStoreProductLink(row.original.id, String(storeId), { custom_available: checked });
              } catch (_) {
                setProducts((prev) => prev.map((p) => p.id === row.original.id ? { ...p, available: !checked } : p));
                toast.error(t("operation_failed"));
              }
            }}
            aria-label={t("table_active")}
            data-testid={`user_store_products_active_${row.original.id}`}
          />
        </div>
      ),
    }] : []),
  ], [onEdit, t, canCreate, hideDuplicate, storeId, handleDuplicate]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination, columnOrder },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: (updater) =>
      setColumnOrder((prev) => {
        const next = typeof updater === "function" ? (updater as (p: string[]) => string[])(prev) : (updater as string[]);
        // Гарантируем, что столбец действий всегда последний
        const withoutActions = next.filter((id) => id !== "actions");
        return [...withoutActions, "actions"];
      }),
    onPaginationChange: setPagination,
  });

  // При изменении набора строк корректируем пагинацию,
  // чтобы не оставаться на несуществующей странице и не показывать пустоту.
  useEffect(() => {
    const pageCount = table.getPageCount();
    if (rows.length === 0 && pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
      return;
    }
    if (pagination.pageIndex >= pageCount && pageCount > 0) {
      setPagination(prev => ({ ...prev, pageIndex: Math.max(0, pageCount - 1) }));
    }
  }, [rows.length, pagination.pageIndex, table]);

  if (!loading && productsCount === 0) {
    return (
      <div className="p-6 bg-background flex justify-center" data-testid="user_products_empty_wrap">
        <div className="w-full max-w-[clamp(18rem,50vw,32rem)]">
          <Empty>
            <EmptyHeader>
              <EmptyMedia className="text-primary">
                <Package className="h-[1.5rem] w-[1.5rem]" />
              </EmptyMedia>
              <EmptyTitle>{t("no_products")}</EmptyTitle>
              <EmptyDescription>{t("no_products_description")}</EmptyDescription>
            </EmptyHeader>
            {storeId ? null : (
              <Button onClick={onCreateNew} className="mt-4" data-testid="user_products_create_btn" disabled={canCreate === false} aria-disabled={canCreate === false}>
                {t("create_product")}
              </Button>
            )}
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-background px-4 sm:px-6 py-4" data-testid="user_products_dataTable_root">
      {/* Toolbar: search + actions inline */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder={t("search_placeholder")}
            value={(table.getColumn("name_ua")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name_ua")?.setFilterValue(event.target.value)}
            className="flex-1 min-w-0 w-[clamp(10rem,40vw,24rem)] sm:w-[clamp(12rem,40vw,28rem)]"
            data-testid="user_products_dataTable_filter"
          />
        </div>

        {(() => {
          const selectedRows = table.getSelectedRowModel().rows;
          const selectedCount = selectedRows.length;
          const selectedRow = selectedRows[0]?.original;
          const canDuplicate = selectedCount === 1 && canCreate !== false && hideDuplicate !== true;
          const canEditSelected = selectedCount === 1;
          const canDeleteSelected = selectedCount >= 1;
          const createDisabled = canCreate === false;

          return (
            <TooltipProvider delayDuration={200}>
              <div
                className="flex items-center gap-2 bg-card/70 backdrop-blur-sm border rounded-md h-9 px-[clamp(0.5rem,1vw,0.75rem)] py-1 shadow-sm"
                data-testid="user_products_actions_block"
              >
                {/* Create new */}
                {storeId ? null : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onCreateNew}
                        aria-label={t("add_product")}
                        disabled={createDisabled}
                        aria-disabled={createDisabled}
                        data-testid="user_products_dataTable_createNew"
                      >
                        <Plus className={`h-4 w-4 ${createDisabled ? "text-muted-foreground" : "text-foreground"}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_create">
                      {t("add_product")}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Duplicate selected */}
                {hideDuplicate ? null : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => selectedRow && handleDuplicate(selectedRow)}
                      aria-label={t("duplicate")}
                      disabled={!canDuplicate}
                      aria-disabled={!canDuplicate}
                      data-testid="user_products_dataTable_duplicateSelected"
                    >
                      <Copy className={`h-4 w-4 ${!canDuplicate ? "text-muted-foreground" : "text-foreground"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_duplicate">
                    {t("duplicate")}
                  </TooltipContent>
                </Tooltip>
                )}

                {/* Edit selected */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => selectedRow && onEdit?.(selectedRow)}
                      aria-label={t("edit")}
                      disabled={!canEditSelected}
                      aria-disabled={!canEditSelected}
                      data-testid="user_products_dataTable_editSelected"
                    >
                      <Edit className={`h-4 w-4 ${!canEditSelected ? "text-muted-foreground" : "text-foreground"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_edit">
                    {t("edit")}
                  </TooltipContent>
                </Tooltip>

                {/* Delete selected */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDeleteDialog({ open: true, product: selectedCount === 1 ? selectedRow || null : null })}
                      aria-label={selectedCount > 1 ? t("delete_selected") : t("delete")}
                      disabled={!canDeleteSelected}
                      aria-disabled={!canDeleteSelected}
                      data-testid="user_products_dataTable_clearSelection"
                    >
                      <Trash2 className={`h-4 w-4 ${!canDeleteSelected ? "text-muted-foreground" : "text-foreground"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_delete">
                    {selectedCount > 1 ? t("delete_selected") : t("delete")}
                  </TooltipContent>
                </Tooltip>

                {/* Columns toggle */}
                <DropdownMenu open={columnsMenuOpen} onOpenChange={setColumnsMenuOpen}>
                  <Tooltip>
                    <DropdownMenuTrigger asChild>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={t("columns_short")}
                          data-testid="user_products_dataTable_viewOptions"
                        >
                          <ColumnsIcon className="h-4 w-4 text-foreground" />
                        </Button>
                      </TooltipTrigger>
                    </DropdownMenuTrigger>
                    <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_columns">
                      {t("columns_short")}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    align="end"
                    className="w-56"
                    onPointerLeave={() => setColumnsMenuOpen(false)}
                    data-testid="user_products_columns_menu"
                  >
                    <DropdownMenuItem disabled className="text-sm">
                      {t("toggle_columns")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {table
                      .getAllLeafColumns()
                      .filter((column) => column.id !== "select" && column.id !== "actions")
                      .map((column) => {
                        const isVisible = column.getIsVisible();
                        // Человеко‑читаемая метка для пункта меню (переводы вместо техничних ID)
                        const labelMap: Record<string, string> = {
                          photo: t("photo"),
                          name_ua: t("table_product"),
                          status: t("table_status"),
                          supplier: t("supplier"),
                          price: t("table_price"),
                          price_old: t("old_price"),
                          price_promo: t("promo_price"),
                          category: t("category"),
                          stock_quantity: t("table_stock"),
                          created_at: t("table_created"),
                          article: t("article"),
                          vendor: t("vendor"),
                          docket_ua: t("short_name_ua"),
                          description_ua: t("product_description_ua"),
                        };
                        const translatedLabel = labelMap[column.id] ?? (typeof column.columnDef.header === "string" ? column.columnDef.header : column.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={isVisible}
                            data-testid={`user_products_columns_item_${column.id}`}
                            // Не закрывать меню при выборе пункта
                            onSelect={(e) => {
                              e.preventDefault();
                            }}
                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          >
                            {translatedLabel}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add to stores */}
                {storeId ? null : (
                <DropdownMenu open={storesMenuOpen} onOpenChange={async (open) => {
                  setStoresMenuOpen(open);
                  if (open) {
                    try {
                      const data = await ProductService.getUserStores();
                      setStores(data || []);
                    } catch (e) {
                      setStores([]);
                    }
                  }
                }}>
                  <Tooltip>
                    <DropdownMenuTrigger asChild>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                  <DropdownMenuContent align="end" className="p-2" data-testid="user_products_addToStores_menu">
                    <div className="text-sm mb-2">{t("select_stores")}</div>
                    <ScrollArea className="max-h-[clamp(12rem,40vh,20rem)]">
                      <div className="flex flex-col gap-1">
                        {(stores || []).length === 0 ? (
                          <div className="text-xs text-muted-foreground px-2 py-1">{t("no_active_stores")}</div>
                        ) : (
                          (stores || []).map((s: any) => {
                            const id = String(s.id);
                            const checked = selectedStoreIds.includes(id);
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
                                <Checkbox
                                  checked={checked}
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
                                <span className="truncate">{s.store_name || s.store_url || id}</span>
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                    <DropdownMenuSeparator />
                    <div className="flex items-center justify-center gap-2 w-full">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={removingStores || selectedStoreIds.length === 0 || table.getSelectedRowModel().rows.length === 0}
                        aria-disabled={removingStores || selectedStoreIds.length === 0 || table.getSelectedRowModel().rows.length === 0}
                        onClick={async () => {
                          const selected = table.getSelectedRowModel().rows.map((r) => r.original).filter(Boolean) as any[];
                          const productIds = Array.from(new Set(selected.map((p) => String(p.id)).filter((v) => !!v)));
                          const storeIds = Array.from(new Set(selectedStoreIds));
                          if (productIds.length === 0 || storeIds.length === 0) return;
                          setRemovingStores(true);
                          try {
                            const { error } = await (supabase as any)
                              .from('store_product_links')
                              .delete()
                              .in('product_id', productIds)
                              .in('store_id', storeIds);
                            if (error) {
                              toast.error(t('failed_remove_from_store'));
                            } else {
                              toast.success(t('product_removed_from_store'));
                            }
                          } catch (e) {
                            toast.error(t('failed_remove_from_store'));
                          } finally {
                            setRemovingStores(false);
                            setStoresMenuOpen(false);
                            setSelectedStoreIds([]);
                          }
                        }}
                        data-testid="user_products_addToStores_delete"
                      >
                        {removingStores ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8"
                        disabled={addingStores || selectedStoreIds.length === 0 || table.getSelectedRowModel().rows.length === 0}
                        aria-disabled={addingStores || selectedStoreIds.length === 0 || table.getSelectedRowModel().rows.length === 0}
                        onClick={async () => {
                          const selected = table.getSelectedRowModel().rows.map((r) => r.original).filter(Boolean) as any[];
                          const storeIds = Array.from(new Set(selectedStoreIds));
                          const productIds = Array.from(new Set(selected.map((p) => String(p.id)).filter((v) => !!v)));
                          if (productIds.length === 0 || storeIds.length === 0) return;
                          setAddingStores(true);
                          try {
                            const payload: any[] = [];
                            for (const p of selected) {
                              const pid = String(p.id);
                              for (const sid of storeIds) {
                                payload.push({
                                  product_id: pid,
                                  store_id: sid,
                                  is_active: true,
                                  custom_price: p.price ?? null,
                                  custom_price_old: p.price_old ?? null,
                                  custom_price_promo: p.price_promo ?? null,
                                  custom_stock_quantity: p.stock_quantity ?? null,
                                });
                              }
                            }
                            const { data: existing, error: selErr } = await (supabase as any)
                              .from('store_product_links')
                              .select('product_id,store_id')
                              .in('product_id', productIds)
                              .in('store_id', storeIds);
                            if (selErr) {
                              toast.error(t('failed_add_product_to_stores'));
                              return;
                            }
                            const existingSet = new Set((existing || []).map((r: any) => `${r.product_id}__${r.store_id}`));
                            const toInsert = payload.filter((r) => !existingSet.has(`${r.product_id}__${r.store_id}`));
                            if (toInsert.length === 0) {
                              toast.success(t('products_already_linked'));
                            } else {
                              const { error: insErr } = await (supabase as any)
                                .from('store_product_links')
                                .insert(toInsert)
                                .select('*');
                              if (insErr) {
                                toast.error(t('failed_add_product_to_stores'));
                              } else {
                                toast.success(t('product_added_to_stores'));
                              }
                            }
                          } catch (e) {
                            toast.error(t('failed_add_product_to_stores'));
                          } finally {
                            setAddingStores(false);
                            setStoresMenuOpen(false);
                            setSelectedStoreIds([]);
                          }
                        }}
                        data-testid="user_products_addToStores_confirm"
                      >
                        {addingStores ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                )}

                {/* Refresh */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => loadProducts()}
                      aria-label={t("refresh")}
                      data-testid="user_products_dataTable_refresh"
                    >
                      <RefreshCw className="h-4 w-4 text-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_refresh">
                    {t("refresh")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          );
        })()}
      </div>

      {/* Table */}
      <div className="bg-background" data-testid="user_products_table">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.id === "actions" ? "text-center" : "text-left"}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
      <TableBody>
            {loading ? (
              <>
                <LoadingSkeleton />
                <LoadingSkeleton />
                <LoadingSkeleton />
              </>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Copying progress - non-modal top-right */}
      <DialogNoOverlay
        open={copyDialog.open}
        onOpenChange={(open) => setCopyDialog((prev) => ({ ...prev, open }))}
        modal={false}
      >
        <DialogNoOverlayContent
          position="top-right"
          variant="info"
          className="p-4 w-[min(24rem,92vw)]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          data-testid="user_products_copy_progress"
        >
          <DialogNoOverlayHeader>
            <DialogNoOverlayTitle className="text-sm flex items-center gap-2">
              <Loader2 className="h-[1rem] w-[1rem] animate-spin text-emerald-600" />
              {t('product_copying')}
            </DialogNoOverlayTitle>
            {copyDialog.name ? (
              <DialogNoOverlayDescription className="text-xs text-muted-foreground">
                {copyDialog.name}
              </DialogNoOverlayDescription>
            ) : null}
          </DialogNoOverlayHeader>
        </DialogNoOverlayContent>
      </DialogNoOverlay>

      <DialogNoOverlay
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ open, product: open ? prev.product : null }))
        }
        modal={false}
      >
        <DialogNoOverlayContent
          position="center"
          className="p-6 w-[min(28rem,92vw)]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogNoOverlayHeader>
            <DialogNoOverlayTitle>{t("delete_product_confirm")}</DialogNoOverlayTitle>
            <DialogNoOverlayDescription>
              {deleteDialog.product?.name ? (
                <span>
                  {t("delete")}: "{deleteDialog.product?.name}". {t("cancel")}? 
                </span>
              ) : (
                <span>{t("delete_product_confirm")}</span>
              )}
            </DialogNoOverlayDescription>
          </DialogNoOverlayHeader>
          <DialogNoOverlayFooter>
            <Button variant="outline" data-testid="user_products_delete_cancel" onClick={() => setDeleteDialog({ open: false, product: null })}>
              {t("cancel")}
            </Button>
            <Button
              data-testid="user_products_delete_confirm"
              onClick={async () => {
                const productToDelete = deleteDialog.product;
                setDeleteDialog({ open: false, product: null });

                try {
                  let didBatch = false;
                  if (productToDelete) {
                    await onDelete?.(productToDelete);
                  } else {
                    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
                    if (storeId) {
                      didBatch = true;
                      try {
                        await Promise.all(
                          selected
                            .map((p: any) => p?.id)
                            .filter((id: any) => !!id)
                            .map((id: string) => ProductService.removeStoreProductLink(String(id), storeId))
                        );
                        toast.success(t('product_removed_from_store'));
                      } catch (_) {
                        toast.error(t('failed_remove_from_store'));
                      }
                      table.resetRowSelection();
                    } else {
                      for (const p of selected) {
                        await onDelete?.(p);
                      }
                      table.resetRowSelection();
                    }
                  }

                  if (didBatch || typeof refreshTrigger === 'undefined') {
                    await loadProducts();
                  }
                } catch (error) {
                  console.error("Delete error:", error);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("delete")}
            </Button>
          </DialogNoOverlayFooter>
        </DialogNoOverlayContent>
      </DialogNoOverlay>

      {/* Pagination (dashboard-01 style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2 border-t" data-testid="user_products_dataTable_pagination">
        {/* Selection status */}
        <div className="text-xs text-muted-foreground" data-testid="user_products_dataTable_selectionStatus">
          {/* Localized dynamic text without interpolation support */}
          {(() => {
            const selected = table.getSelectedRowModel().rows.length;
            const total = table.getFilteredRowModel().rows.length || 0;
            // Ukrainian vs English
            return t("rows_selected") === "Вибрано"
              ? `Вибрано ${selected} з ${total} рядків.`
              : `${selected} of ${total} row(s) selected.`;
          })()}
        </div>

        {/* Rows per page (moved from toolbar) */}
        <div className="flex items-center gap-2" data-testid="user_products_dataTable_rowsPerPage">
          <div className="text-sm" data-testid="user_products_dataTable_rowsPerPageLabel">{t("page_size")}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                aria-label={t("page_size")}
                data-testid="user_products_dataTable_pageSize"
              >
                <List className="h-4 w-4 mr-2" />
                {table.getState().pagination.pageSize}
                <ChevronDown className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {[5, 10, 20, 50].map((size) => (
                <DropdownMenuCheckboxItem
                  key={size}
                  checked={table.getState().pagination.pageSize === size}
                  onCheckedChange={() => table.setPageSize(size)}
                  data-testid={`user_products_dataTable_pageSize_${size}`}
                >
                  {size}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Page indicator + controls */}
        <div className="flex items-center gap-2" data-testid="user_products_dataTable_pageControls">
          <div className="text-sm whitespace-nowrap" data-testid="user_products_dataTable_pageIndicator">
            {t("page_of")} {table.getState().pagination.pageIndex + 1} {t("page_of_connector")} {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label={t("first_page")}
              data-testid="user_products_dataTable_firstPage"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label={t("previous_page")}
              data-testid="user_products_dataTable_prevPage"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label={t("next_page")}
              data-testid="user_products_dataTable_nextPage"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))}
              disabled={!table.getCanNextPage()}
              aria-label={t("last_page")}
              data-testid="user_products_dataTable_lastPage"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsTable;
