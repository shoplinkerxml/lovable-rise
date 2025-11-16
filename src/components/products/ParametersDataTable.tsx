import * as React from "react";
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
import { MoreHorizontal, Columns as ColumnsIcon, ChevronDown, Trash2, Pencil } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";

// Keep local type consistent with ProductFormTabs
export interface ProductParam {
  id?: string;
  name: string;
  value: string;
  order_index: number;
  paramid?: string;
  valueid?: string;
}

type Props = {
  data: ProductParam[];
  onEditRow: (rowIndex: number) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDeleteSelected?: (rowIndexes: number[]) => void;
};

export function ParametersDataTable({ data, onEditRow, onDeleteRow, onDeleteSelected }: Props) {
  const { t } = useI18n();

  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const columns = React.useMemo<ColumnDef<ProductParam>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
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
        <div className="flex items-center justify-center">
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
      accessorKey: "name",
      header: t("characteristic_name"),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "value",
      header: t("value"),
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.value}</span>,
    },
    {
      accessorKey: "paramid",
      header: t("param_id"),
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.paramid || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "valueid",
      header: t("value_id"),
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.valueid || ""}</span>,
      enableHiding: true,
    },
    {
      accessorKey: "order_index",
      header: t("order"),
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.order_index}</span>,
      enableHiding: true,
    },
    {
      id: "actions",
      header: t("actions"),
      enableSorting: false,
      enableHiding: false,
      size: 96,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="parametersDataTable_rowActions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditRow(row.index)} data-testid="parametersDataTable_rowAction_edit">
              <Pencil className="h-4 w-4 mr-2" /> {t("edit_characteristic")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRow(row.index)} data-testid="parametersDataTable_rowAction_delete">
              <Trash2 className="h-4 w-4 mr-2" /> {t("delete_characteristic")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [onEditRow, onDeleteRow, t]);

  const table = useReactTable({
    data,
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

  const selectedIndices = React.useMemo(() => {
    return table
      .getSelectedRowModel()
      .flatRows.map((r) => r.index);
  }, [table]);

  return (
    <div className="flex flex-col gap-3" data-testid="parametersDataTable_root">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("search_placeholder")}
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="w-[clamp(12rem,40vw,24rem)]"
            data-testid="parametersDataTable_filter"
          />
          {selectedIndices.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDeleteSelected?.(selectedIndices);
                table.resetRowSelection();
              }}
              data-testid="parametersDataTable_deleteSelected"
            >
              {t("btn_delete_selected")}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" data-testid="parametersDataTable_viewOptions">
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
                  const header = column.columnDef.header as string | JSX.Element;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={isVisible}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      data-testid={`parametersDataTable_toggle_${column.id}`}
                    >
                      {header}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" data-testid="parametersDataTable_pageSize">
                {t("page_size")}: {table.getState().pagination.pageSize}
                <ChevronDown className="ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {[5, 10, 20, 50].map((size) => (
                <DropdownMenuCheckboxItem
                  key={size}
                  checked={table.getState().pagination.pageSize === size}
                  onCheckedChange={() => table.setPageSize(size)}
                  data-testid={`parametersDataTable_pageSize_${size}`}
                >
                  {size}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-testid={`parametersDataTable_row_${row.index}`}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
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

      {/* Pagination */}
      <div className="flex items-center justify-between px-1" data-testid="parametersDataTable_pagination">
        <div className="text-xs text-muted-foreground">
          {t("rows_selected")}: {selectedIndices.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            data-testid="parametersDataTable_prevPage"
          >
            {"<"}
          </Button>
          <span className="text-sm">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            data-testid="parametersDataTable_nextPage"
          >
            {">"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ParametersDataTable;