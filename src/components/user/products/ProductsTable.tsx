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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { format } from "date-fns";
import { Edit, MoreHorizontal, Package, Trash2, Columns as ColumnsIcon } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { ProductService, type Product } from "@/lib/product-service";
import { supabase } from "@/integrations/supabase/client";

type ProductsTableProps = {
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onCreateNew?: () => void;
  onProductsLoaded?: (count: number) => void;
  refreshTrigger?: number;
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

function ProductStatusBadge({ available }: { available?: boolean }) {
  const { t } = useI18n();
  const isActive = available ?? false;
  return (
    <Badge
      variant={isActive ? "default" : "secondary"}
      className={
        isActive
          ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
          : "bg-muted/50 text-muted-foreground border-muted hover:bg-muted/50"
      }
    >
      {isActive ? t("status_active") : t("status_inactive")}
    </Badge>
  );
}

function ProductActionsDropdown({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer focus:text-destructive">
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

  const rows = useMemo(() => products, [products]);

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    status: false,
    stock_quantity: false,
    created_at: false,
    article: false,
    vendor: false,
    available: false,
    docket_ua: false,
    description_ua: false,
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

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
          <div className="min-w-0" data-testid="user_products_name">
            <div className="font-medium truncate" title={name}>{name}</div>
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("table_status"),
      cell: ({ row }) => (
        <ProductStatusBadge available={row.original.available} />
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
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.article || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "vendor",
      header: t("vendor"),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{(row.original as any).vendor || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "docket_ua",
      header: t("short_name_ua"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{(row.original as any).docket_ua || ""}</span>
      ),
      enableHiding: true,
    },
    {
      accessorKey: "description_ua",
      header: t("product_description_ua"),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{(row.original as any).description_ua || ""}</span>
      ),
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
          />
        </div>
      ),
    },
  ], [onEdit, t]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
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
      <div className="p-6 bg-background" data-testid="user_products_empty_wrap">
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="text-primary">
              <Package className="h-[1.5rem] w-[1.5rem]" />
            </EmptyMedia>
            <EmptyTitle>{t("no_products")}</EmptyTitle>
            <EmptyDescription>{t("no_products_description")}</EmptyDescription>
          </EmptyHeader>
          <Button onClick={onCreateNew} className="mt-4" data-testid="user_products_create_btn">
            {t("create_product")}
          </Button>
        </Empty>
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
          {table.getSelectedRowModel().rows.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => table.resetRowSelection()}
              data-testid="user_products_dataTable_clearSelection"
            >
              {t("btn_delete_selected")}
            </Button>
          )}
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

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, product: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_product_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.product?.name ? (
                <span>
                  {t("delete")}: "{deleteDialog.product?.name}". {t("cancel")}?
                </span>
              ) : (
                <span>{t("delete_product_confirm")}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!deleteDialog.product) return;
              // Сначала закрываем диалог, чтобы не было ощущения "зависания"
              setDeleteDialog({ open: false, product: null });
              try {
                await onDelete?.(deleteDialog.product.id);
                // Если внешний триггер не используется, обновим список локально
                if (typeof refreshTrigger === 'undefined') {
                  await loadProducts();
                }
              } catch (error) {
                console.error("Delete error:", error);
              }
            }} className="bg-destructive hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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