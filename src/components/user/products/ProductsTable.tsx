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
import type { Table as TanTable } from "@tanstack/react-table";
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
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { ProductService, type Product } from "@/lib/product-service";
 
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableHeader } from "./ProductsTable/SortableHeader";
import { LoadingSkeleton } from "./ProductsTable/LoadingSkeleton";
import { PaginationFooter } from "./ProductsTable/PaginationFooter";
import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useProductsRealtime } from "@/hooks/useProductsRealtime";
import { useVirtualRows } from "@/hooks/useVirtualRows";
import { CopyProgressDialog, DeleteDialog, DeleteProgressDialog } from "./ProductsTable/Dialogs";
import { Toolbar } from "./ProductsTable/Toolbar";
import { createColumns } from "./ProductsTable/columns";
import type { ShopAggregated } from "@/lib/shop-service";
import type { ProductRow } from "./ProductsTable/columns";

 

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
  const [loading, setLoading] = useState(true);
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

  const [items, setItems] = useState<ProductRow[]>([]);
  const itemsRef = useRef<ProductRow[]>([]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [pagination, setPagination] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('user_products_pagination');
        if (raw) {
          const parsed = JSON.parse(raw) as { pageIndex?: number; pageSize?: number };
          const pi = typeof parsed.pageIndex === 'number' ? Math.max(0, parsed.pageIndex) : 0;
          const ps = typeof parsed.pageSize === 'number' ? Math.max(5, parsed.pageSize) : 10;
          return { pageIndex: pi, pageSize: ps };
        }
      }
    } catch { /* ignore */ }
    return { pageIndex: 0, pageSize: 10 };
  });
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
      const initialFetchSize = Math.max(pagination.pageSize, (pagination.pageIndex + 1) * pagination.pageSize);
      const { products, page } = await ProductService.getProductsFirstPage(storeId ?? null, initialFetchSize);
      setItems(products as ProductRow[]);
      setPageInfo(page);
      onProductsLoadedRef.current?.(page?.total ?? products.length);
    } finally {
      setLoading(false);
      onLoadingChangeRef.current?.(false);
      loadingFirstRef.current = false;
    }
  }, [storeId, pagination.pageSize, pagination.pageIndex]);

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
    if (storeId) {
      const names = Array.from(new Set((items || []).map((p) => String(p.categoryName || '')).filter((v) => !!v)));
      setCategoryFilterOptions(names);
    } else {
      setCategoryFilterOptions([]);
    }
  }, [storeId, items]);

  useEffect(() => { loadFirstPage(); }, [loadFirstPage, refreshTrigger]);
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const payload = JSON.stringify({ pageIndex: pagination.pageIndex, pageSize: pagination.pageSize });
        window.localStorage.setItem('user_products_pagination', payload);
      }
    } catch { /* ignore */ }
  }, [pagination.pageIndex, pagination.pageSize]);
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
      if (duplicatingRef.current) return;
      if (canCreate === false) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
        return;
      }
      const nameForUi = product.name_ua || product.name || product.external_id || product.id;
      setCopyDialog({ open: true, name: nameForUi });
      duplicatingRef.current = true;
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
      duplicatingRef.current = false;
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
  const [stores, setStores] = useState<ShopAggregated[]>([]);
  const storeNames = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of stores || []) m[String(s.id)] = String(s.store_name || "");
    return m;
  }, [stores]);
  const { data: shopsAgg } = useQuery({ queryKey: ['shopsList'], queryFn: ShopService.getShopsAggregated });
  useEffect(() => { if (Array.isArray(shopsAgg)) setStores(shopsAgg as ShopAggregated[]); }, [shopsAgg]);
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

  

  

  const columns = useMemo<ColumnDef<ProductRow>[]>(() => createColumns({
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
  }), [t, storeId, categoryFilterOptions, storeNames, stores, loadStoresForMenu, handleRemoveStoreLink, handleStoresUpdate, onEdit, handleDuplicate, canCreate, hideDuplicate, handleToggleAvailable, copyDialog.open]);

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
      <Toolbar
        t={t}
        table={table}
        storeId={storeId}
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
                const ids = selected.map((p) => String(p.id));
                if (onDelete && selected.length === 1) {
                  await onDelete(selected[0]);
                } else {
                  try {
                    setDeleteProgress({ open: true });
                    await ProductService.bulkDeleteProducts(ids);
                    setProductsCached((prev) => prev.filter((p) => !ids.includes(String(p.id))));
                    setPageInfo((prev) => prev ? { ...prev, total: Math.max(0, (prev.total ?? 0) - ids.length) } : prev);
                    didBatch = true;
                    toast.success(t('products_deleted_successfully'));
                  } catch (_) {
                    toast.error(t('failed_delete_product'));
                  } finally { setDeleteProgress({ open: false }); }
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
