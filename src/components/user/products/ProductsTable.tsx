import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
import type { Column, FilterFn, Table as TanTable } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
// dropdown components moved to subcomponents
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
import { DialogNoOverlay } from "@/components/ui/dialog-no-overlay";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { format } from "date-fns";
import { Package, Plus, Loader2, Copy, Edit, Trash2 } from "lucide-react";
import { ShopService } from "@/lib/shop-service";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { ProductService, type Product } from "@/lib/product-service";
import { supabase } from "@/integrations/supabase/client";
import { R2Storage } from "@/lib/r2-storage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { StoresBadgeCell } from "./ProductsTable/StoresBadgeCell";
import { SortableHeader } from "./ProductsTable/SortableHeader";
import { LoadingSkeleton } from "./ProductsTable/LoadingSkeleton";
import { ProductStatusBadge } from "./ProductsTable/ProductStatusBadge";
import { SortToggle } from "./ProductsTable/SortToggle";
import { ColumnFilterMenu } from "./ProductsTable/ColumnFilterMenu";
 
import { PaginationFooter } from "./ProductsTable/PaginationFooter";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import { useVirtualRows } from "@/hooks/useVirtualRows";
import { CopyProgressDialog, DeleteDialog } from "./ProductsTable/Dialogs";

const AddToStoresMenuLazy = React.lazy(() => import("./ProductsTable/AddToStoresMenu").then((m) => ({ default: m.AddToStoresMenu })));
const ProductActionsDropdownLazy = React.lazy(() => import("./ProductsTable/RowActionsDropdown").then((m) => ({ default: m.ProductActionsDropdown })));
const ViewOptionsMenuLazy = React.lazy(() => import("./ProductsTable/ViewOptionsMenu").then((m) => ({ default: m.ViewOptionsMenu })));
type TTable = import("@tanstack/react-table").Table<ProductRow>;
const ViewOptionsMenuLazyTyped = ViewOptionsMenuLazy as unknown as React.ComponentType<{ table: TTable }>;
const AddToStoresMenuLazyTyped = AddToStoresMenuLazy as unknown as React.ComponentType<{ open: boolean; setOpen: (v: boolean) => void; loadStoresForMenu: () => Promise<void>; stores: StoreAgg[]; setStores: (v: StoreAgg[]) => void; selectedStoreIds: string[]; setSelectedStoreIds: React.Dispatch<React.SetStateAction<string[]>>; items: ProductRow[]; table: TTable; removingStores: boolean; setRemovingStores: (v: boolean) => void; removingStoreId: string | null; setRemovingStoreId: (v: string | null) => void; queryClient: import("@tanstack/react-query").QueryClient; addingStores: boolean; setAddingStores: (v: boolean) => void; setProductsCached: (updater: (prev: ProductRow[]) => ProductRow[]) => void; setLastSelectedProductIds?: (ids: string[]) => void }>;

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

// moved to subcomponents: LoadingSkeleton, ProductStatusBadge

 

 

type ProductRow = Product & {
  mainImageUrl?: string;
  categoryName?: string;
  supplierName?: string;
  linkedStoreIds?: string[];
  vendor?: string | null;
  docket_ua?: string | null;
  description_ua?: string | null;
  available?: boolean;
};

type PageInfo = { limit: number; offset: number; hasMore: boolean; nextOffset: number | null; total: number };
type ResponseData = { products: ProductRow[]; page: PageInfo };
type StoreAgg = { id: string; store_name?: string | null; store_url?: string | null; productsCount?: number; categoriesCount?: number };

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
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  const [copyDialog, setCopyDialog] = useState<{ open: boolean; name: string | null }>({
    open: false,
    name: null,
  });

  let productsCount = 0;

  const [items, setItems] = useState<ProductRow[]>([]);
  const itemsRef = useRef<ProductRow[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const setProductsCached = useCallback((updater: (prev: ProductRow[]) => ProductRow[]) => {
    setItems((prev) => updater(prev));
    queryClient.setQueryData(['products', storeId ?? 'all'], (prev: ProductRow[] | undefined) => updater(prev ?? []));
    try {
      const sizedKey = `rq:products:first:${storeId ?? 'all'}:${pagination.pageSize}`;
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(sizedKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as { items: ProductRow[]; page?: PageInfo; expiresAt: number };
        if (parsed && Array.isArray(parsed.items)) {
          const nextItems = updater(parsed.items as ProductRow[]);
          const payload = JSON.stringify({ items: nextItems, page: parsed.page, expiresAt: parsed.expiresAt });
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(sizedKey, payload);
          }
        }
      }
      ProductService.updateFirstPageCaches(storeId ?? null, (arr) => updater(arr as ProductRow[]));
      ProductService.updateFirstPageCaches(null, (arr) => updater(arr as ProductRow[]));
    } catch { void 0; }
  }, [queryClient, storeId, pagination.pageSize]);
  const [categoryFilterOptions, setCategoryFilterOptions] = useState<string[]>([]);
  const requestedOffsets = useRef<Set<number>>(new Set());
  const loadingFirstRef = useRef(false);
  const loadingNextRef = useRef(false);
  const [lastSelectedProductIds, setLastSelectedProductIds] = useState<string[]>([]);

  const onProductsLoadedRef = useRef(onProductsLoaded);
  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => { onProductsLoadedRef.current = onProductsLoaded; }, [onProductsLoaded]);
  useEffect(() => { onLoadingChangeRef.current = onLoadingChange; }, [onLoadingChange]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    onLoadingChangeRef.current?.(true);
    if (loadingFirstRef.current) return;
    loadingFirstRef.current = true;
    requestedOffsets.current.clear();
    try {
      const { products, page } = await ProductService.getProductsFirstPage(storeId ?? null, pagination.pageSize);
      setItems(products as ProductRow[]);
      setPageInfo(page);
      onProductsLoadedRef.current?.(page?.total ?? products.length);
    } finally {
      setLoading(false);
      onLoadingChangeRef.current?.(false);
      loadingFirstRef.current = false;
    }
  }, [storeId, pagination.pageSize]);

  const loadNextPage = useCallback(async (override?: { limit: number; offset: number | null }) => {
    const nextOffset = override?.offset ?? pageInfo?.nextOffset ?? null;
    const nextLimit = override?.limit ?? pagination.pageSize;
    if (nextOffset == null) return;
    if (pageInfo && !pageInfo.hasMore) return;
    if (loadingNextRef.current) return;
    if (requestedOffsets.current.has(nextOffset)) return;
    requestedOffsets.current.add(nextOffset);
    setLoading(true);
    onLoadingChangeRef.current?.(true);
    loadingNextRef.current = true;
    try {
      const { products, page } = await ProductService.getProductsPage(storeId ?? null, nextLimit, nextOffset);
      setItems((prev) => [...prev, ...(products as ProductRow[])]);
      setPageInfo(page ?? null);
      onProductsLoadedRef.current?.(page?.total ?? (items.length + products.length));
    } finally {
      setLoading(false);
      onLoadingChangeRef.current?.(false);
      loadingNextRef.current = false;
    }
  }, [pageInfo, storeId, items.length, pagination.pageSize]);

  useEffect(() => {
    (async () => {
      try {
        if (storeId) {
          const names = await ProductService.getStoreCategoryFilterOptions(String(storeId));
          setCategoryFilterOptions(names);
        } else {
          setCategoryFilterOptions([]);
        }
      } catch { setCategoryFilterOptions([]); }
    })();
  }, [storeId]);

  useEffect(() => { loadFirstPage(); }, [loadFirstPage, refreshTrigger]);
  useEffect(() => {
    const requiredForCurrent = (pagination.pageIndex + 1) * pagination.pageSize;
    const requiredForPrefetch = (pagination.pageIndex + 2) * pagination.pageSize;
    const canLoad = pageInfo && pageInfo.hasMore && pageInfo.nextOffset != null;
    if (!canLoad) return;
    if (loadingFirstRef.current) return;
    if (items.length < requiredForCurrent && !loadingNextRef.current && !requestedOffsets.current.has(pageInfo!.nextOffset!)) {
      loadNextPage();
      return;
    }
    
  }, [pagination.pageIndex, pagination.pageSize, items.length, pageInfo, loadNextPage]);

  const products: ProductRow[] = items;
  productsCount = pageInfo?.total ?? products.length;
  useEffect(() => {
    const total = pageInfo?.total ?? products.length;
    onProductsLoadedRef.current?.(total);
  }, [products.length, pageInfo]);
  useProductsRealtime(storeId, queryClient);

  

  // Дублирование товара и обновление таблицы
  const handleDuplicate = useCallback(async (product: Product) => {
    try {
      if (canCreate === false) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
        return;
      }
      const nameForUi = product.name_ua || product.name || product.external_id || product.id;
      setCopyDialog({ open: true, name: nameForUi });
      await ProductService.duplicateProduct(product.id);
      await loadFirstPage();
    } catch (error) {
      console.error("Duplicate product failed", error);
      const err = error as unknown as { message?: unknown };
      const msg = typeof err.message === 'string' ? err.message : '';
      if (msg.toLowerCase().includes('ліміт') || msg.toLowerCase().includes('limit')) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
      } else {
        toast.error(t('failed_duplicate_product'));
      }
    } finally {
      setCopyDialog({ open: false, name: null });
    }
  }, [canCreate, t, loadFirstPage]);

  const handleStoresUpdate = useCallback((productId: string, ids: string[], opts?: { storeIdChanged?: string | number; categoryKey?: string; added?: boolean }) => {
    try {
      const storeChanged = opts?.storeIdChanged ? String(opts.storeIdChanged) : null;
      const categoryKey = opts?.categoryKey || null;
      const added = !!opts?.added;
      if (storeChanged && categoryKey) {
        const matchesKey = (p: ProductRow) => {
          const key = p.category_id != null ? `cat:${p.category_id}` : p.category_external_id ? `ext:${p.category_external_id}` : null;
          return key === categoryKey;
        };
        const arr = itemsRef.current || [];
        const hasOtherInCategory = arr.some((p) => {
          if (String(p.id) === String(productId)) return false;
          const idsStr = (p.linkedStoreIds || []).map(String);
          return idsStr.includes(storeChanged) && matchesKey(p);
        });
        if (added) {
          if (!hasOtherInCategory) ShopService.bumpCategoriesCountInCache(storeChanged, 1);
        } else {
          const remains = hasOtherInCategory;
          if (!remains) ShopService.bumpCategoriesCountInCache(storeChanged, -1);
        }
      }
    } catch { void 0; }
    setProductsCached((prev) => prev.map((p) => p.id === productId ? { ...p, linkedStoreIds: ids } : p));
  }, [setProductsCached]);

  const handleToggleAvailable = useCallback(async (productId: string, checked: boolean) => {
    try {
      setProductsCached((prev) => prev.map((p) => p.id === productId ? { ...p, available: checked } : p));
      await ProductService.updateStoreProductLink(productId, String(storeId), { custom_available: checked });
    } catch (_) {
      setProductsCached((prev) => prev.map((p) => p.id === productId ? { ...p, available: !checked } : p));
      toast.error(t("operation_failed"));
    }
  }, [storeId, setProductsCached, t]);

  const handleRemoveStoreLink = useCallback(async (productId: string, storeIdToRemove: string) => {
    const pid = String(productId);
    const sid = String(storeIdToRemove);
    let reverted = false;
    setProductsCached((prev) => prev.map((p) => p.id === pid ? { ...p, linkedStoreIds: (p.linkedStoreIds || []).filter((id) => String(id) !== sid) } : p));
    try {
      await ProductService.bulkRemoveStoreProductLinks([pid], [sid]);
      try { ShopService.bumpProductsCountInCache(sid, -1); } catch { void 0; }
      try { await ProductService.recomputeStoreCategoryFilterCache(sid); } catch { void 0; }
      try { queryClient.invalidateQueries({ queryKey: ['shopsList'] }); } catch { void 0; }
      toast.success(t('product_removed_from_store'));
    } catch (_) {
      reverted = true;
      setProductsCached((prev) => prev.map((p) => p.id === pid ? { ...p, linkedStoreIds: Array.from(new Set([...(p.linkedStoreIds || []), sid])) } : p));
      toast.error(t('failed_remove_from_store'));
    }
    return !reverted;
  }, [setProductsCached, queryClient, t]);

  const currentStart = pagination.pageIndex * pagination.pageSize;
  const currentEnd = currentStart + pagination.pageSize;
  const rows = useMemo(() => products.slice(currentStart, Math.min(currentEnd, products.length)), [products, currentStart, currentEnd]);

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  // Persisted column visibility (hide vendor/short name/description by default)
  const COLUMN_VIS_KEY = "user_products_columnVisibility";
  const DEFAULT_COLUMN_VISIBILITY = useMemo<VisibilityState>(() => ({
    select: true,
    created_at: false,
    supplier: true,
    vendor: false,
    available: false,
    docket_ua: false,
    description_ua: false,
    price_old: false,
    price_promo: false,
  }), []);
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
  }, [DEFAULT_COLUMN_VISIBILITY]);
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
  // ViewOptionsMenu manages its own open state
  const [storesMenuOpen, setStoresMenuOpen] = useState(false);
  const [stores, setStores] = useState<StoreAgg[]>([]);
  const storeNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of stores || []) m[String(s.id)] = String(s.store_name || "");
    return m;
  }, [stores]);
  const { data: shopsAgg } = useQuery({ queryKey: ['shopsList'], queryFn: ShopService.getShopsAggregated });
  useEffect(() => { if (Array.isArray(shopsAgg)) setStores(shopsAgg as StoreAgg[]); }, [shopsAgg]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const loadStoresForMenu = useCallback(async () => {
    const cachedAgg = queryClient.getQueryData<StoreAgg[]>(['shopsList']);
    if (Array.isArray(cachedAgg) && cachedAgg.length > 0) {
      setStores(cachedAgg);
      return;
    }
    const data = await ShopService.getShopsAggregated();
    setStores((data || []) as StoreAgg[]);
    try { queryClient.setQueryData<StoreAgg[]>(['shopsList'], (data || []) as StoreAgg[]); } catch { void 0; }
  }, [queryClient]);
  const [addingStores, setAddingStores] = useState(false);
  const [removingStores, setRemovingStores] = useState(false);
  const [removingStoreId, setRemovingStoreId] = useState<string | null>(null);

  useEffect(() => {
    setColumnOrder((prev) => {
      const filtered = prev.filter((id) => id !== "active" && id !== "actions" && id !== "stores");
      if (storeId) {
        return [...filtered, "active", "actions"];
      }
      return [...filtered, "stores", "actions"];
    });
  }, [storeId]);

  // Toggle sort control rendered as native button with inline SVG icon
  // legacy inline SortToggle removed (extracted to subcomponent)

  // legacy inline ColumnFilterMenu removed (extracted to subcomponent)

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
      "stores",
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

  const stringFilter: FilterFn<ProductRow> = (row, id, value) => {
    const rv = row.getValue(id);
    const str = rv == null ? "" : String(rv);
    if (value == null) return true;
    if (Array.isArray(value)) return (value as unknown[]).map((v) => String(v as unknown as string)).includes(str);
    return str.toLowerCase().includes(String(value).toLowerCase());
  };

  const renderHeader = (label: string, column: Column<ProductRow, unknown>, table: TanTable<ProductRow>, extra?: React.ReactNode) => (
    <div className="flex items-center gap-2">
      <span className="truncate">{label}</span>
      <div className="flex items-center gap-0 ml-auto">
        <SortToggle column={column} table={table} />
        {extra ?? <ColumnFilterMenu column={column} />}
      </div>
    </div>
  );

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
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
            aria-label={t("select_all")}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-start">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(value === true)}
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
        const hasStores = Array.isArray(product.linkedStoreIds) && product.linkedStoreIds.length > 0;
        const sizeCls = hasStores
          ? "h-[clamp(2.25rem,4vw,3rem)] w-[clamp(2.25rem,4vw,3rem)]"
          : "h-[clamp(1.75rem,3vw,2.5rem)] w-[clamp(1.75rem,3vw,2.5rem)]";
        return (
          <div className="flex items-center justify-start" data-testid="user_products_photo">
            <Avatar className={`${sizeCls} rounded-md`}>
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
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("table_product"), column, table),
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
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("table_status"), column, table),
      cell: ({ row }) => (
        <ProductStatusBadge state={row.original.state} />
      ),
      enableHiding: true,
    },
    {
      id: "supplier",
      accessorFn: (row) => row.supplierName ?? "",
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("supplier"), column, table),
      cell: ({ row }) => {
        const name = row.original.supplierName;
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
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("table_price"), column, table),
      cell: ({ row }) => {
        const currency = row.original.currency_code || "";
        const symbol = currency === "UAH" ? "грн" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
        return row.original.price != null ? (
          <span className="tabular-nums">{row.original.price} {symbol}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "price_old",
      accessorFn: (row) => (typeof row.price_old === "number" ? row.price_old : Number.NEGATIVE_INFINITY),
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("old_price"), column, table),
      cell: ({ row }) => {
        const currency = row.original.currency_code || "";
        const symbol = currency === "UAH" ? "грн" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
        return row.original.price_old != null ? (
          <span className="tabular-nums" data-testid="user_products_priceOld">{row.original.price_old} {symbol}</span>
        ) : (
          <span className="text-muted-foreground" data-testid="user_products_priceOld_empty">—</span>
        );
      },
      enableHiding: true,
    },
    {
      id: "price_promo",
      accessorFn: (row) => (typeof row.price_promo === "number" ? row.price_promo : Number.NEGATIVE_INFINITY),
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("promo_price"), column, table),
      cell: ({ row }) => {
        const currency = row.original.currency_code || "";
        const symbol = currency === "UAH" ? "грн" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
        return row.original.price_promo != null ? (
          <span className="tabular-nums" data-testid="user_products_pricePromo">{row.original.price_promo} {symbol}</span>
        ) : (
          <span className="text-muted-foreground" data-testid="user_products_pricePromo_empty">—</span>
        );
      },
      enableHiding: true,
    },
    {
      id: "category",
      accessorFn: (row) => row.categoryName ?? "",
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("category"), column, table, (
        <ColumnFilterMenu column={column} extraOptions={storeId ? categoryFilterOptions : []} />
      )),
      cell: ({ row }) => {
        const name = row.original.categoryName;
        return name ? <span className="text-sm">{name}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "stock_quantity",
      accessorFn: (row) => (typeof row.stock_quantity === "number" ? row.stock_quantity : Number.NEGATIVE_INFINITY),
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("table_stock"), column, table),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          {row.original.stock_quantity != null ? (
            <span className="tabular-nums">{row.original.stock_quantity}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
      enableHiding: true,
    },
    {
      id: "created_at",
      accessorFn: (row) => {
        const v = row.created_at;
        try { return v ? new Date(v).getTime() : 0; } catch { return 0; }
      },
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("table_created"), column, table),
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
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("article"), column, table),
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.article || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "vendor",
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("vendor"), column, table),
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.vendor || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "docket_ua",
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("short_name_ua"), column, table),
      cell: ({ row }) => {
        const shortName = row.original.docket_ua || "";
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
      filterFn: stringFilter,
      header: ({ column, table }) => renderHeader(t("product_description_ua"), column, table),
      cell: ({ row }) => {
        const desc = row.original.description_ua || "";
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
    ...(!storeId ? [{
      id: "stores",
      header: ({ column }) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{t("stores")}</span>
          <div className="ml-auto flex items-center gap-0">
            <ColumnFilterMenu column={column} />
          </div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
      cell: ({ row }) => (
        <StoresBadgeCell
          product={row.original}
          storeNames={storeNames}
          onRemove={handleRemoveStoreLink}
          onStoresUpdate={handleStoresUpdate}
        />
      ),
    }] : []),
    {
      id: "actions",
      header: t("table_actions"),
      enableSorting: false,
      enableHiding: false,
      size: 96,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <React.Suspense fallback={null}>
          <ProductActionsDropdownLazy
            product={row.original}
            onEdit={() => onEdit?.(row.original)}
            onDelete={() => setDeleteDialog({ open: true, product: row.original })}
            onDuplicate={() => handleDuplicate(row.original)}
            onTrigger={() => row.toggleSelected(true)}
            canCreate={canCreate}
            hideDuplicate={hideDuplicate}
            storeId={storeId}
            onStoresUpdate={handleStoresUpdate}
          />
          </React.Suspense>
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
            checked={!!row.original.available}
            onCheckedChange={(checked) => handleToggleAvailable(row.original.id, checked)}
            aria-label={t("table_active")}
            data-testid={`user_store_products_active_${row.original.id}`}
          />
        </div>
      ),
    }] : []),
  ], [onEdit, t, canCreate, hideDuplicate, storeId, handleDuplicate, categoryFilterOptions, setProductsCached, storeNames, handleRemoveStoreLink, handleStoresUpdate, handleToggleAvailable]);

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
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(((pageInfo?.total ?? products.length) / pagination.pageSize))),
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tableElRef = useRef<HTMLTableElement | null>(null);
  const rowHeight = 44;
  const enableVirtual = pagination.pageSize >= 50;
  const { virtualStart, virtualEnd, topH, bottomH } = useVirtualRows(enableVirtual, rows.length, tableElRef, rowHeight);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnOrder((prev) => {
      const withoutActions = prev.filter((id) => id !== "actions");
      const fromIndex = withoutActions.indexOf(String(active.id));
      const toIndex = withoutActions.indexOf(String(over.id));
      if (fromIndex === -1 || toIndex === -1) return [...withoutActions, "actions"];
      const moved = arrayMove(withoutActions, fromIndex, toIndex);
      return [...moved, "actions"];
    });
  }

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(((pageInfo?.total ?? products.length) / pagination.pageSize)));
    if (pagination.pageIndex >= pageCount && pageCount > 0) {
      setPagination(prev => ({ ...prev, pageIndex: Math.max(0, pageCount - 1) }));
    }
  }, [products.length, pagination.pageIndex, pagination.pageSize, pageInfo]);

  useEffect(() => {
    try {
      const selected = table.getSelectedRowModel().rows.map((r) => r.original) as ProductRow[];
      if (selected.length === 1) {
        const ids = Array.from(new Set((selected[0].linkedStoreIds || []).map(String)));
        setSelectedStoreIds(ids);
      }
    } catch { void 0; }
  }, [rowSelection, table]);

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
                <React.Suspense fallback={null}>
                  <ViewOptionsMenuLazyTyped table={table} />
                </React.Suspense>

                {/* Add to stores */}
                {storeId ? null : (
                  <React.Suspense fallback={null}>
                  <AddToStoresMenuLazyTyped
                    open={storesMenuOpen}
                    setOpen={setStoresMenuOpen}
                    loadStoresForMenu={loadStoresForMenu}
                    stores={stores}
                    setStores={setStores}
                    selectedStoreIds={selectedStoreIds}
                    setSelectedStoreIds={setSelectedStoreIds}
                    items={items}
                    table={table}
                    removingStores={removingStores}
                    setRemovingStores={setRemovingStores}
                    removingStoreId={removingStoreId}
                    setRemovingStoreId={setRemovingStoreId}
                    queryClient={queryClient}
                    addingStores={addingStores}
                    setAddingStores={setAddingStores}
                    setProductsCached={setProductsCached}
                    setLastSelectedProductIds={setLastSelectedProductIds}
                  />
                  </React.Suspense>
                )}

                
              </div>
            </TooltipProvider>
          );
        })()}
      </div>

      {/* Table */}
      <div className="bg-background" data-testid="user_products_table">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <Table ref={tableElRef}
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => {
                const ids = headerGroup.headers.map((h) => h.column.id).filter((id) => id !== "actions");
                return (
                  <SortableContext key={headerGroup.id} items={ids}>
                    <TableRow>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className={header.column.id === "actions" ? "text-center" : "text-left"}>
                          {header.isPlaceholder ? null : (
                            header.column.id === "actions" ? (
                              flexRender(header.column.columnDef.header, header.getContext())
                            ) : (
                              <SortableHeader id={header.column.id}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </SortableHeader>
                            )
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </SortableContext>
                );
              })}
            </TableHeader>
        <TableBody>
            {(loading && rows.length === 0) ? (
              <>
                {Array.from({ length: pagination.pageSize }).map((_, i) => (
                  <LoadingSkeleton key={`loading-row-${i}`} />
                ))}
              </>
            ) : table.getRowModel().rows?.length ? (
              (() => {
                if (!enableVirtual) {
                  return table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/50">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ));
                }
                const all = table.getRowModel().rows;
                const slice = all.slice(virtualStart, virtualEnd);
                const topH = virtualStart * rowHeight;
                const bottomH = Math.max(0, (all.length - virtualEnd) * rowHeight);
                const cellsCount = columns.length;
                return (
                  <>
                    {topH > 0 ? (
                      <TableRow style={{ height: topH }}>
                        <TableCell colSpan={cellsCount} />
                      </TableRow>
                    ) : null}
                    {slice.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-muted/50" style={{ height: rowHeight }}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {bottomH > 0 ? (
                      <TableRow style={{ height: bottomH }}>
                        <TableCell colSpan={cellsCount} />
                      </TableRow>
                    ) : null}
                  </>
                );
              })()
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("no_results")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </DndContext>
      </div>

      {/* Copying progress - non-modal top-right */}
      <CopyProgressDialog open={copyDialog.open} name={copyDialog.name} t={t} />

      <DeleteDialog
        open={deleteDialog.open}
        product={deleteDialog.product}
        t={t}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ open, product: open ? prev.product : null }))}
        onConfirm={async () => {
          const productToDelete = deleteDialog.product;
          setDeleteDialog({ open: false, product: null });
          try {
            let didBatch = false;
            if (productToDelete) {
              await onDelete?.(productToDelete);
            } else {
              const selected = table.getSelectedRowModel().rows.map((r) => r.original) as ProductRow[];
              if (storeId) {
                didBatch = true;
                try {
                  await Promise.all(
                    selected
                      .map((p) => p.id)
                      .filter((id) => !!id)
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
              queryClient.invalidateQueries({ queryKey: ['products', storeId ?? 'all'] });
            }
          } catch (error) {
            console.error("Delete error:", error);
          }
        }}
      />

      <PaginationFooter table={table} pagination={pagination} setPagination={setPagination} pageInfo={pageInfo} rows={rows} />
    </div>
  );
};

export default ProductsTable;
