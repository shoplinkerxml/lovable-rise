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
import { Edit, MoreHorizontal, Package, Trash2, Columns as ColumnsIcon, Plus, Copy } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { ProductService, type Product } from "@/lib/product-service";
import { supabase } from "@/integrations/supabase/client";

type ProductsTableProps = {
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => Promise<void> | void;
  onCreateNew?: () => void;
  onProductsLoaded?: (count: number) => void;
  refreshTrigger?: number;
  canCreate?: boolean;
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

function ProductActionsDropdown({ onEdit, onDelete, onDuplicate, onTrigger, canCreate }: { onEdit: () => void; onDelete: () => void; onDuplicate?: () => void; onTrigger?: () => void; canCreate?: boolean }) {
  const { t } = useI18n();
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
        <DropdownMenuItem onClick={onDuplicate} className="cursor-pointer" data-testid="user_products_row_duplicate" disabled={canCreate === false}>
          <Copy className="mr-2 h-4 w-4" />
          {t("duplicate")}
        </DropdownMenuItem>
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
};

export const ProductsTable = ({
  onEdit,
  onDelete,
  onCreateNew,
  onProductsLoaded,
  refreshTrigger,
  canCreate,
}: ProductsTableProps) => {
  const { t } = useI18n();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  const productsCount = products.length;

  useEffect(() => {
    loadProducts();
  }, [refreshTrigger]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await ProductService.getProducts();
      onProductsLoaded?.(data.length);

      const ids = (data ?? []).map((p) => p.id).filter(Boolean) as string[];
      const categoryIds = (data ?? [])
        .map((p: any) => p.category_id)
        .filter((v) => !!v);

      let mainImageMap: Record<string, string> = {};
      let categoryNameMap: Record<string, string> = {};

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

      const augmented = (data ?? []).map((p: any) => ({
        ...p,
        mainImageUrl: p.id ? mainImageMap[String(p.id)] : undefined,
        categoryName:
          (p.category_id && categoryNameMap[String(p.category_id)]) ||
          (p.category_external_id && categoryNameMap[String(p.category_external_id)]) ||
          undefined,
      }));

      setProducts(augmented as ProductRow[]);
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoading(false);
    }
  };

  // Дублирование товара и обновление таблицы
  const handleDuplicate = async (product: Product) => {
    try {
      if (canCreate === false) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
        return;
      }
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
    }
  };

  const rows = useMemo(() => products, [products]);

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    select: true,
    created_at: false,
    vendor: false,
    available: false,
    docket_ua: false,
    description_ua: false,
  });
  // Default column order: photo → article → category → name → price → quantity → status → actions
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "select",
    "photo",
    "article",
    "category",
    "name_ua",
    "price",
    "stock_quantity",
    "status",
    "created_at",
    "vendor",
    "docket_ua",
    "description_ua",
    "actions",
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Динамическая ширина колонки названия: уменьшается по мере добавления видимых столбцов
  const dynamicNameMaxVW = useMemo(() => {
    // Список колонок, которые визуально отнимают место у названия
    const spaceConsumers = [
      "status",
      "price",
      "category",
      "stock_quantity",
      "created_at",
      "article",
      "vendor",
      "docket_ua",
      "description_ua",
      "photo",
      "select",
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
      header: t("table_product"),
      accessorFn: (row) => row.name_ua ?? row.name ?? "",
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
      header: t("table_status"),
      cell: ({ row }) => (
        <ProductStatusBadge state={row.original.state} />
      ),
      enableHiding: true,
    },
    {
      id: "price",
      header: t("table_price"),
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
      id: "category",
      header: t("category"),
      cell: ({ row }) => {
        const name = row.original.categoryName;
        return name ? <span className="text-sm">{name}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "stock_quantity",
      header: t("table_stock"),
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
      header: t("table_created"),
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
      header: t("article"),
      cell: ({ row }) => <span className="text-sm text-foreground">{row.original.article || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "vendor",
      header: t("vendor"),
      cell: ({ row }) => <span className="text-sm text-foreground">{(row.original as any).vendor || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "docket_ua",
      header: t("short_name_ua"),
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
      header: t("product_description_ua"),
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
            onEdit={() => onEdit?.(row.original)}
            onDelete={() => setDeleteDialog({ open: true, product: row.original })}
            onDuplicate={() => handleDuplicate(row.original)}
            onTrigger={() => row.toggleSelected(true)}
            canCreate={canCreate}
          />
        </div>
      ),
    },
  ], [onEdit, t]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination, columnOrder },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
            <Button onClick={onCreateNew} className="mt-4" data-testid="user_products_create_btn" disabled={canCreate === false} aria-disabled={canCreate === false}>
              {t("create_product")}
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 bg-background px-4 sm:px-6 py-4" data-testid="user_products_dataTable_root">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("search_placeholder")}
            value={(table.getColumn("name_ua")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name_ua")?.setFilterValue(event.target.value)}
            className="w-[clamp(12rem,40vw,24rem)]"
            data-testid="user_products_dataTable_filter"
          />
          {productsCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCreateNew}
              title={t("add_product")}
              disabled={canCreate === false}
              aria-disabled={canCreate === false}
              data-testid="user_products_dataTable_createNew"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {/* Selection actions: one → duplicate + edit + delete; many → delete only */}
          {(() => {
            const selected = table.getSelectedRowModel().rows;
            const count = selected.length;
            if (count === 1) {
              const selectedRow = selected[0];
              return (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDuplicate(selectedRow.original)}
                    aria-label={t("duplicate")}
                    title={t("duplicate")}
                    disabled={canCreate === false}
                    aria-disabled={canCreate === false}
                    data-testid="user_products_dataTable_duplicateSelected"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit?.(selectedRow.original)}
                    aria-label={t("edit")}
                    data-testid="user_products_dataTable_editSelected"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeleteDialog({ open: true, product: selectedRow.original })}
                    aria-label={t("delete")}
                    data-testid="user_products_dataTable_clearSelection"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              );
            }
            if (count > 1) {
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDeleteDialog({ open: true, product: null })}
                  aria-label={t("delete_selected")}
                  data-testid="user_products_dataTable_clearSelection"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              );
            }
            return null;
          })()}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" data-testid="user_products_dataTable_viewOptions">
                <ColumnsIcon className="mr-2 h-4 w-4" />
                {t("view_options")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled className="text-sm">
                {t("toggle_columns")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((column) => column.id !== "select" && column.id !== "actions")
                .map((column) => {
                  const isVisible = column.getIsVisible();
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={isVisible}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
                  if (productToDelete) {
                    await onDelete?.(productToDelete);
                  } else {
                    const selected = table.getSelectedRowModel().rows;
                    for (const r of selected) {
                      await onDelete?.(r.original);
                    }
                    table.resetRowSelection();
                  }

                  if (typeof refreshTrigger === 'undefined') {
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-1" data-testid="user_products_dataTable_pagination">
        <div className="text-xs text-muted-foreground">
          {t("rows_selected")}: {table.getSelectedRowModel().rows.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("prev")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductsTable;