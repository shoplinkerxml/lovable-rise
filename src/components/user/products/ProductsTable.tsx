import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
import { Button } from "@/components/ui/button";
// dropdown components moved to subcomponents
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
 
 
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Package } from "lucide-react";
import { ShopService } from "@/lib/shop-service";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { ProductService, type Product } from "@/lib/product-service";
import { readCache, writeCache, CACHE_TTL } from "@/lib/cache-utils";
import { runOptimisticOperation } from "@/lib/optimistic-mutation";
 
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableHeader } from "./ProductsTable/SortableHeader";
import { LoadingSkeleton } from "./ProductsTable/LoadingSkeleton";
import { PaginationFooter } from "./ProductsTable/PaginationFooter";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { ShopCountsService } from "@/lib/shop-counts";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import { useVirtualRows } from "@/hooks/useVirtualRows";
import { CopyProgressDialog, DeleteDialog, DeleteProgressDialog } from "./ProductsTable/Dialogs";
import { Toolbar } from "./ProductsTable/Toolbar";
import { useProductColumns } from "./ProductsTable/columns";
import type { ShopAggregated } from "@/lib/shop-service";
import type { ProductRow } from "./ProductsTable/columns";
import { UserAuthService } from "@/lib/user-auth-service";

 

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

 

 

 

type PageInfo = { limit: number; offset: number; hasMore: boolean; nextOffset: number | null; total: number };
type ResponseData = { products: ProductRow[]; page: PageInfo };
 

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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  const [copyDialog, setCopyDialog] = useState<{ open: boolean; name: string | null }>({
    open: false,
    name: null,
  });
  const duplicatingRef = useRef<boolean>(false);
  const [deleteProgress, setDeleteProgress] = useState<{ open: boolean }>({ open: false });

  let productsCount = 0;

  const [pagination, setPagination] = useState(() => {
    const env = readCache<{ pageIndex?: number; pageSize?: number }>("user_products_pagination", true);
    if (env?.data) {
      const pi = typeof env.data.pageIndex === "number" ? Math.max(0, env.data.pageIndex) : 0;
      const ps = typeof env.data.pageSize === "number" ? Math.max(5, env.data.pageSize) : 10;
      return { pageIndex: pi, pageSize: ps };
    }
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("user_products_pagination");
        if (raw) {
          const parsed = JSON.parse(raw) as { pageIndex?: number; pageSize?: number };
          const pi = typeof parsed.pageIndex === "number" ? Math.max(0, parsed.pageIndex) : 0;
          const ps = typeof parsed.pageSize === "number" ? Math.max(5, parsed.pageSize) : 10;
          writeCache("user_products_pagination", { pageIndex: pi, pageSize: ps }, CACHE_TTL.uiPrefs);
          return { pageIndex: pi, pageSize: ps };
        }
      }
    } catch { void 0; }
    return { pageIndex: 0, pageSize: 10 };
  });
  const productsQueryKey = useMemo(
    () => ["products", storeId ?? "all", "pageSize", pagination.pageSize] as const,
    [storeId, pagination.pageSize],
  );
  const productsQuery = useInfiniteQuery<ResponseData, Error, InfiniteData<ResponseData, number>, typeof productsQueryKey, number>({
    queryKey: productsQueryKey,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = Number.isFinite(pageParam) ? pageParam : 0;
      const { products, page } = await ProductService.getProductsPage(storeId ?? null, pagination.pageSize, offset);
      return { products: products as unknown as ProductRow[], page: page as unknown as PageInfo };
    },
    getNextPageParam: (lastPage) => (lastPage?.page?.nextOffset == null ? undefined : lastPage.page.nextOffset),
    placeholderData: (prev) => prev,
  });
  const items = useMemo(
    () => (productsQuery.data?.pages || []).flatMap((p) => (Array.isArray(p?.products) ? p.products : [])),
    [productsQuery.data],
  );
  const pageInfo: PageInfo | null = useMemo(() => {
    const pages = productsQuery.data?.pages || [];
    const last = pages.length > 0 ? pages[pages.length - 1] : null;
    return (last?.page as PageInfo | undefined) ?? null;
  }, [productsQuery.data]);
  const loading = productsQuery.isPending || (productsQuery.isFetching && items.length === 0);
  const setProductsCached = useCallback((updater: (prev: ProductRow[]) => ProductRow[]) => {
    queryClient.setQueriesData({ queryKey: ["products", storeId ?? "all"], exact: false }, (old: any) => {
      if (!old) return old;
      if (Array.isArray(old)) return updater(old as ProductRow[]);
      if (typeof old === "object" && Array.isArray((old as any).pages)) {
        const prev = old as any;
        return {
          ...prev,
          pages: prev.pages.map((p: any) => {
            const products = Array.isArray(p?.products) ? (p.products as ProductRow[]) : [];
            return { ...p, products: updater(products) };
          }),
        };
      }
      return old;
    });
  }, [queryClient, storeId]);
  const [categoryFilterOptions, setCategoryFilterOptions] = useState<string[]>([]);
  const [, setLastSelectedProductIds] = useState<string[]>([]);

  const onProductsLoadedRef = useRef(onProductsLoaded);
  const onLoadingChangeRef = useRef(onLoadingChange);
  useEffect(() => { onProductsLoadedRef.current = onProductsLoaded; }, [onProductsLoaded]);
  useEffect(() => { onLoadingChangeRef.current = onLoadingChange; }, [onLoadingChange]);

  useEffect(() => {
    onLoadingChangeRef.current?.(productsQuery.isFetching);
  }, [productsQuery.isFetching]);

  useEffect(() => {
    if (storeId) {
      const names = Array.from(new Set((items || []).map((p) => String(p.categoryName || '')).filter((v) => !!v)));
      setCategoryFilterOptions(names);
    } else {
      setCategoryFilterOptions([]);
    }
  }, [storeId, items]);
  const refreshFirstRef = useRef(true);
  useEffect(() => {
    if (refreshFirstRef.current) {
      refreshFirstRef.current = false;
      return;
    }
    if (refreshTrigger == null) return;
    queryClient.invalidateQueries({ queryKey: ["products", storeId ?? "all"], exact: false });
  }, [refreshTrigger, queryClient, storeId]);
  useEffect(() => {
    try {
      writeCache('user_products_pagination', { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }, CACHE_TTL.uiPrefs);
    } catch { void 0; }
  }, [pagination.pageIndex, pagination.pageSize]);
  const hasNextPage = productsQuery.hasNextPage;
  const isFetchingNextPage = productsQuery.isFetchingNextPage;
  const fetchNextPage = productsQuery.fetchNextPage;
  useEffect(() => {
    const requiredForCurrent = (pagination.pageIndex + 1) * pagination.pageSize;
    const requiredForPrefetch = (pagination.pageIndex + 2) * pagination.pageSize;
    const canLoad = !!hasNextPage;
    if (!canLoad) return;
    if (isFetchingNextPage) return;
    if (items.length < requiredForCurrent) {
      void fetchNextPage();
      return;
    }
    if (items.length < requiredForPrefetch) {
      void fetchNextPage();
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    items.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const products: ProductRow[] = items;
  productsCount = pageInfo?.total ?? products.length;
  useEffect(() => {
    const total = pageInfo?.total ?? products.length;
    onProductsLoadedRef.current?.(total);
  }, [products.length, pageInfo]);
  useProductsRealtime(storeId, queryClient);

  

  const handleDuplicate = useCallback(async (product: Product) => {
    try {
      if (duplicatingRef.current) return;
      if (canCreate === false) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
        return;
      }
      const nameForUi = product.name_ua || product.name || product.external_id || product.id;
      setCopyDialog({ open: true, name: nameForUi });
      duplicatingRef.current = true;
      await runOptimisticOperation({
        entityKey: `product:duplicate:${product.id}`,
        run: async () => {
          await ProductService.duplicateProduct(product.id);
          await queryClient.refetchQueries({ queryKey: ["products", storeId ?? "all"], exact: false });
        },
      });
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
      duplicatingRef.current = false;
    }
  }, [canCreate, queryClient, storeId, t]);

  

  const handleToggleAvailable = useCallback(async (productId: string, checked: boolean) => {
    try {
      setProductsCached((prev) => prev.map((p) => p.id === productId ? { ...p, available: checked } : p));
      await ProductService.updateStoreProductLink(productId, String(storeId), { custom_available: checked });
    } catch (_) {
      setProductsCached((prev) => prev.map((p) => p.id === productId ? { ...p, available: !checked } : p));
      toast.error(t("operation_failed"));
    }
  }, [storeId, setProductsCached, t]);

  

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
      const env = readCache<VisibilityState>(COLUMN_VIS_KEY, true);
      if (env?.data) {
        setColumnVisibility(() => ({ ...DEFAULT_COLUMN_VISIBILITY, ...(env.data || {}) }));
        return;
      }
      const saved = typeof window !== "undefined" ? localStorage.getItem(COLUMN_VIS_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved) as VisibilityState;
        setColumnVisibility(() => ({ ...DEFAULT_COLUMN_VISIBILITY, ...(parsed || {}) }));
        writeCache(COLUMN_VIS_KEY, parsed, CACHE_TTL.uiPrefs);
      } else {
        setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
      }
    } catch {
      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    }
  }, [DEFAULT_COLUMN_VISIBILITY]);
  useEffect(() => {
    try {
      writeCache(COLUMN_VIS_KEY, columnVisibility, CACHE_TTL.uiPrefs);
    } catch { void 0; }
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
  const [stores, setStores] = useState<ShopAggregated[]>([]);
  const [authStoreNames, setAuthStoreNames] = useState<Record<string, string>>({});
  const storeNames = useMemo(() => {
    const m: Record<string, string> = { ...(authStoreNames || {}) };
    for (const s of stores || []) {
      const name = String(s.store_name || "");
      if (name) m[String(s.id)] = name;
    }
    return m;
  }, [stores, authStoreNames]);
  
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const loadStoresForMenu = useCallback(async () => {
    const cachedAgg = queryClient.getQueryData<ShopAggregated[]>(['shopsList']);
    if (Array.isArray(cachedAgg) && cachedAgg.length > 0) {
      setStores(cachedAgg);
      return;
    }
    const data = await ShopService.getShopsAggregated();
    setStores((data || []) as ShopAggregated[]);
    try { queryClient.setQueryData<ShopAggregated[]>(['shopsList'], (data || []) as ShopAggregated[]); } catch { void 0; }
  }, [queryClient]);
  const [addingStores, setAddingStores] = useState(false);
  const [removingStores, setRemovingStores] = useState(false);
  const [removingStoreId, setRemovingStoreId] = useState<string | null>(null);

  const handleStoresUpdate = useCallback((productId: string, ids: string[], _opts?: { storeIdChanged?: string | number; categoryKey?: string; added?: boolean }) => {
    setProductsCached((prev) => prev.map((p) => p.id === productId ? { ...p, linkedStoreIds: ids } : p));
    try { setSelectedStoreIds(ids.map(String)); } catch { void 0; }
    try {
      const updated = queryClient.getQueryData<ShopAggregated[]>(["shopsList"]) || [];
      setStores(updated);
    } catch { void 0; }
  }, [setProductsCached, queryClient]);

  const handleRemoveStoreLink = useCallback(async (productId: string, storeIdToRemove: string) => {
    const pid = String(productId);
    const sid = String(storeIdToRemove);
    let reverted = false;
    setProductsCached((prev) => prev.map((p) => p.id === pid ? { ...p, linkedStoreIds: (p.linkedStoreIds || []).filter((id) => String(id) !== sid) } : p));
    try {
      const { deletedByStore, categoryNamesByStore } = await ProductService.bulkRemoveStoreProductLinks([pid], [sid]);
      const deleted = Math.max(0, Number(deletedByStore?.[sid] ?? 1) || 0);
      if (deleted > 0) {
        ShopCountsService.bumpProducts(queryClient, sid, -deleted);
      }
      const cats = categoryNamesByStore?.[sid];
      if (Array.isArray(cats)) {
        const cnt = cats.length;
        queryClient.setQueryData(ShopCountsService.key(sid), (old: any) => {
          const prevProducts = Number(old?.productsCount ?? 0) || 0;
          return { productsCount: prevProducts, categoriesCount: cnt };
        });
        queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((s) => (String(s.id) === sid ? { ...s, categoriesCount: cnt } : s));
        });
      }
      try {
        const updated = queryClient.getQueryData<ShopAggregated[]>(['shopsList']) || [];
        setStores(updated);
      } catch { /* ignore */ }
      try { setSelectedStoreIds((prev) => prev.filter((id) => String(id) !== String(sid))); } catch { void 0; }
      toast.success(t('product_removed_from_store'));
    } catch (_) {
      reverted = true;
      setProductsCached((prev) => prev.map((p) => p.id === pid ? { ...p, linkedStoreIds: Array.from(new Set([...(p.linkedStoreIds || []), sid])) } : p));
      toast.error(t('failed_remove_from_store'));
    }
    return !reverted;
  }, [setProductsCached, queryClient, t]);
  useEffect(() => {
    try {
      const cachedAgg = queryClient.getQueryData<ShopAggregated[]>(['shopsList']);
      if (Array.isArray(cachedAgg) && cachedAgg.length > 0) {
        setStores(cachedAgg);
      }
    } catch { void 0; }
  }, [queryClient]);

  useEffect(() => {
    if (storeId) return;
    loadStoresForMenu().catch(() => void 0);
  }, [storeId, loadStoresForMenu]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await UserAuthService.fetchAuthMe();
        if (cancelled) return;
        const names: Record<string, string> = {};
        for (const s of auth?.userStores || []) {
          const id = String((s as any)?.id ?? "");
          if (!id) continue;
          names[id] = String((s as any)?.store_name ?? "");
        }
        if (Object.keys(names).length > 0) setAuthStoreNames(names);
      } catch { void 0; }
    })();
    return () => { cancelled = true; };
  }, []);

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

  

  const columns: ColumnDef<ProductRow>[] = useProductColumns({
    t,
    storeId,
    categoryFilterOptions,
    storeNames,
    stores,
    loadStoresForMenu,
    handleRemoveStoreLink,
    handleStoresUpdate,
    onEdit,
    setDeleteDialog: (v) => setDeleteDialog(v),
    handleDuplicate,
    canCreate,
    hideDuplicate,
    handleToggleAvailable,
    duplicating: copyDialog.open,
  });

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
  const { virtualStart, virtualEnd } = useVirtualRows(enableVirtual, rows.length, tableElRef, rowHeight);

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
      <Toolbar
        t={t}
        table={table}
        storeId={storeId}
        loading={loading}
        onCreateNew={onCreateNew}
        onEdit={onEdit}
        canCreate={canCreate}
        hideDuplicate={hideDuplicate}
        setDeleteDialog={(v) => setDeleteDialog(v)}
        handleDuplicate={handleDuplicate}
        duplicating={copyDialog.open}
        storesMenuOpen={storesMenuOpen}
        setStoresMenuOpen={setStoresMenuOpen}
        loadStoresForMenu={loadStoresForMenu}
        stores={stores}
        setStores={setStores}
        selectedStoreIds={selectedStoreIds}
        setSelectedStoreIds={setSelectedStoreIds}
        items={items}
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
      <DeleteProgressDialog open={deleteProgress.open} t={t} />

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
              setProductsCached((prev) => prev.filter((p) => String(p.id) !== String(productToDelete.id)));
              try { await queryClient.refetchQueries({ queryKey: ["products", storeId ?? "all"], exact: false }); } catch { void 0; }
            } else {
              const selected = table.getSelectedRowModel().rows.map((r) => r.original) as ProductRow[];
              if (storeId) {
                didBatch = true;
                try {
                  const ids = selected.map((p) => String(p.id)).filter(Boolean);
                  setDeleteProgress({ open: true });
                  const { deleted, deletedByStore, categoryNamesByStore } = await ProductService.bulkRemoveStoreProductLinks(
                    ids,
                    [String(storeId)]
                  );
                  setProductsCached((prev) => prev.filter((p) => !ids.includes(String(p.id))));
                  const sid = String(storeId);
                  const removedCount = Math.max(
                    0,
                    Number(deletedByStore?.[sid] ?? deleted ?? ids.length) || 0
                  );
                  try {
                    if (removedCount > 0) {
                      ShopCountsService.bumpProducts(queryClient, sid, -removedCount);
                    }
                    const cats = categoryNamesByStore?.[sid];
                    if (Array.isArray(cats)) {
                      const cnt = cats.length;
                      queryClient.setQueryData(ShopCountsService.key(sid), (old: any) => {
                        const prevProducts = Number(old?.productsCount ?? 0) || 0;
                        return { productsCount: prevProducts, categoriesCount: cnt };
                      });
                      queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
                        if (!Array.isArray(prev)) return prev;
                        return prev.map((s) => (String(s.id) === sid ? { ...s, categoriesCount: cnt } : s));
                      });
                      queryClient.setQueryData<ShopAggregated | null>(["shopDetail", sid], (prev) => {
                        if (!prev) return prev;
                        return { ...prev, categoriesCount: cnt };
                      });
                    }
                  } catch { void 0; }
                  toast.success(t('product_removed_from_store'));
                  try { await queryClient.refetchQueries({ queryKey: ["products", storeId ?? "all"], exact: false }); } catch { void 0; }
                } catch (_) {
                  toast.error(t('failed_remove_from_store'));
                } finally { setDeleteProgress({ open: false }); }
                table.resetRowSelection();
              } else {
                const ids = selected.map((p) => String(p.id));
                if (onDelete && selected.length === 1) {
                  await onDelete(selected[0]);
                } else {
                  try {
                    setDeleteProgress({ open: true });
                    await ProductService.bulkDeleteProducts(ids);
                    setProductsCached((prev) => prev.filter((p) => !ids.includes(String(p.id))));
                    didBatch = true;
                    toast.success(t('products_deleted_successfully'));
                    try { await queryClient.refetchQueries({ queryKey: ["products", storeId ?? "all"], exact: false }); } catch { void 0; }
                  } catch (_) {
                    toast.error(t('failed_delete_product'));
                  } finally { setDeleteProgress({ open: false }); }
                }
                table.resetRowSelection();
              }
            }
            if (didBatch || typeof refreshTrigger === 'undefined') {
              queryClient.invalidateQueries({ queryKey: ["products", storeId ?? "all"], exact: false });
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
