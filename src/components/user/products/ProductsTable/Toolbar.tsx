import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Copy, Edit, Trash2 } from "lucide-react";
import type { Product } from "@/lib/product-service";
import type { QueryClient } from "@tanstack/react-query";
import type { Table as TanTable } from "@tanstack/react-table";
import type { ProductRow } from "./columns";
import type { ShopAggregated } from "@/lib/shop-service";

const ViewOptionsMenuLazy = React.lazy(() => import("./ViewOptionsMenu").then((m) => ({ default: m.ViewOptionsMenu })));
const AddToStoresMenuLazy = React.lazy(() => import("./AddToStoresMenu").then((m) => ({ default: m.AddToStoresMenu })));
type TTable = TanTable<ProductRow>;
const ViewOptionsMenuLazyTyped = ViewOptionsMenuLazy as unknown as React.ComponentType<{ table: TTable }>;
const AddToStoresMenuLazyTyped = AddToStoresMenuLazy as unknown as React.ComponentType<{ open: boolean; setOpen: (v: boolean) => void; loadStoresForMenu: () => Promise<void>; stores: ShopAggregated[]; setStores: (v: ShopAggregated[]) => void; selectedStoreIds: string[]; setSelectedStoreIds: React.Dispatch<React.SetStateAction<string[]>>; items: ProductRow[]; table: TTable; removingStores: boolean; setRemovingStores: (v: boolean) => void; removingStoreId: string | null; setRemovingStoreId: (v: string | null) => void; queryClient: QueryClient; addingStores: boolean; setAddingStores: (v: boolean) => void; setProductsCached: (updater: (prev: ProductRow[]) => ProductRow[]) => void; setLastSelectedProductIds?: (ids: string[]) => void }>;

export function Toolbar({
  t,
  table,
  storeId,
  onCreateNew,
  onEdit,
  canCreate,
  hideDuplicate,
  setDeleteDialog,
  handleDuplicate,
  storesMenuOpen,
  setStoresMenuOpen,
  loadStoresForMenu,
  stores,
  setStores,
  selectedStoreIds,
  setSelectedStoreIds,
  items,
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
  t: (k: string) => string;
  table: TTable;
  storeId?: string;
  onCreateNew?: () => void;
  onEdit?: (p: ProductRow) => void;
  canCreate?: boolean;
  hideDuplicate?: boolean;
  setDeleteDialog: (v: { open: boolean; product: ProductRow | null }) => void;
  handleDuplicate: (p: Product) => Promise<void>;
  storesMenuOpen: boolean;
  setStoresMenuOpen: (v: boolean) => void;
  loadStoresForMenu: () => Promise<void>;
  stores: ShopAggregated[];
  setStores: (v: ShopAggregated[]) => void;
  selectedStoreIds: string[];
  setSelectedStoreIds: React.Dispatch<React.SetStateAction<string[]>>;
  items: ProductRow[];
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
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedRow = selectedRows[0]?.original as ProductRow | undefined;
  const canDuplicate = selectedCount === 1 && canCreate !== false && hideDuplicate !== true;
  const canEditSelected = selectedCount === 1;
  const canDeleteSelected = selectedCount >= 1;
  const createDisabled = canCreate === false;

  return (
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

      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-2 bg-card/70 backdrop-blur-sm border rounded-md h-9 px-[clamp(0.5rem,1vw,0.75rem)] py-1 shadow-sm" data-testid="user_products_actions_block">
          {storeId ? null : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCreateNew} aria-label={t("add_product")} disabled={createDisabled} aria-disabled={createDisabled} data-testid="user_products_dataTable_createNew">
                  <Plus className={`h-4 w-4 ${createDisabled ? "text-muted-foreground" : "text-foreground"}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_create">
                {t("add_product")}
              </TooltipContent>
            </Tooltip>
          )}

          {hideDuplicate ? null : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectedRow && handleDuplicate(selectedRow)} aria-label={t("duplicate")} disabled={!canDuplicate} aria-disabled={!canDuplicate} data-testid="user_products_dataTable_duplicateSelected">
                  <Copy className={`h-4 w-4 ${!canDuplicate ? "text-muted-foreground" : "text-foreground"}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_duplicate">
                {t("duplicate")}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectedRow && setDeleteDialog({ open: true, product: selectedCount === 1 ? selectedRow || null : null })} aria-label={selectedCount > 1 ? t("delete_selected") : t("delete")} disabled={!canDeleteSelected} aria-disabled={!canDeleteSelected} data-testid="user_products_dataTable_clearSelection">
                <Trash2 className={`h-4 w-4 ${!canDeleteSelected ? "text-muted-foreground" : "text-foreground"}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_delete">
              {selectedCount > 1 ? t("delete_selected") : t("delete")}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => selectedRow && onEdit?.(selectedRow)} aria-label={t("edit")} disabled={!canEditSelected} aria-disabled={!canEditSelected} data-testid="user_products_dataTable_editSelected">
                <Edit className={`h-4 w-4 ${!canEditSelected ? "text-muted-foreground" : "text-foreground"}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-sm" data-testid="user_products_tooltip_edit">
              {t("edit")}
            </TooltipContent>
          </Tooltip>

          <React.Suspense fallback={null}>
            <ViewOptionsMenuLazyTyped table={table} />
          </React.Suspense>

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
    </div>
  );
}
