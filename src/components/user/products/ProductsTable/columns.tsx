import React from "react";
import type { ColumnDef, FilterFn, Column } from "@tanstack/react-table";
import type { Table as TanTable } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { SortToggle } from "./SortToggle";
import { ColumnFilterMenu } from "./ColumnFilterMenu";
import { StoresBadgeCell } from "./StoresBadgeCell";
import { ProductStatusBadge } from "./ProductStatusBadge";
const ProductActionsDropdownLazy = React.lazy(() => import("./RowActionsDropdown").then((m) => ({ default: m.ProductActionsDropdown })));
import type { Product } from "@/lib/product-service";
import type { ShopAggregated } from "@/lib/shop-service";

export type ProductRow = Product & {
  linkedStoreIds?: string[];
  category_id?: number | null;
  category_external_id?: string | null;
  stock_quantity?: number | null;
  available?: boolean;
  supplierName?: string | null;
  categoryName?: string | null;
  mainImageUrl?: string | null;
  currency_code?: string | null;
};

export function createColumns({
  t,
  storeId,
  categoryFilterOptions,
  storeNames,
  stores,
  loadStoresForMenu,
  handleRemoveStoreLink,
  handleStoresUpdate,
  onEdit,
  setDeleteDialog,
  handleDuplicate,
  canCreate,
  hideDuplicate,
  handleToggleAvailable,
}: {
  t: (k: string) => string;
  storeId?: string;
  categoryFilterOptions: string[];
  storeNames: Record<string, string>;
  stores: ShopAggregated[];
  loadStoresForMenu: () => Promise<void>;
  handleRemoveStoreLink: (productId: string, storeIdToRemove: string) => Promise<boolean> | boolean;
  handleStoresUpdate: (productId: string, ids: string[], opts?: { storeIdChanged?: string | number; categoryKey?: string | null; added?: boolean }) => void;
  onEdit?: (p: ProductRow) => void;
  setDeleteDialog: (v: { open: boolean; product: ProductRow | null }) => void;
  handleDuplicate: (p: Product) => Promise<void>;
  canCreate?: boolean;
  hideDuplicate?: boolean;
  handleToggleAvailable: (productId: string, checked: boolean) => void;
}): ColumnDef<ProductRow>[] {
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

  const actionsCell = (row: ProductRow) => (
    <div className="flex justify-center">
      <React.Suspense fallback={null}>
        <ProductActionsDropdownLazy
          product={row}
          onEdit={() => onEdit?.(row)}
          onDelete={() => setDeleteDialog({ open: true, product: row })}
          onDuplicate={() => handleDuplicate(row)}
          onTrigger={() => void 0}
          canCreate={canCreate}
          hideDuplicate={hideDuplicate}
          storeId={storeId}
          onStoresUpdate={handleStoresUpdate}
          storesList={stores}
          storeNames={storeNames}
          prefetchStores={loadStoresForMenu}
        />
      </React.Suspense>
    </div>
  );

  const columns: ColumnDef<ProductRow>[] = [
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
      enableSorting: true,
      enableHiding: false,
      enableColumnFilter: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original.linkedStoreIds || []).length > 0 ? 1 : 0;
        const b = (rowB.original.linkedStoreIds || []).length > 0 ? 1 : 0;
        return a - b;
      },
      filterFn: ((row, id, value) => {
        const selected = Array.isArray(value) ? (value as unknown[]).map((v) => String(v as unknown as string)) : (value == null ? [] : [String(value)]);
        if (selected.length === 0) return true;
        const ids = (row.original.linkedStoreIds || []).map(String);
        const names = ids.map((sid) => storeNames[sid] || sid);
        return selected.some((name) => names.includes(name));
      }) as FilterFn<ProductRow>,
      header: ({ column, table }) => renderHeader(t("stores"), column, table, (
        <ColumnFilterMenu column={column} extraOptions={Object.values(storeNames)} />
      )),
      size: 96,
      cell: ({ row }) => (
        <StoresBadgeCell
          product={row.original}
          storeNames={storeNames}
          storesList={stores}
          prefetchStores={loadStoresForMenu}
          onRemove={handleRemoveStoreLink}
          onStoresUpdate={handleStoresUpdate}
        />
      ),
    }] : []),
    ...(storeId ? [{
      id: "active",
      header: t("table_active"),
      enableSorting: false,
      enableHiding: false,
      size: 64,
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
    {
      id: "actions",
      header: t("actions"),
      enableSorting: false,
      enableHiding: false,
      size: 96,
      cell: ({ row }) => actionsCell(row.original),
    },
  ];

  return columns;
}
