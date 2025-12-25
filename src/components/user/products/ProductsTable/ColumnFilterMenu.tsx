import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export function ColumnFilterMenu<TData>({ column, extraOptions }: { column: import("@tanstack/react-table").Column<TData, unknown>; extraOptions?: string[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const hasAccessor = Boolean((column as unknown as { columnDef?: { accessorFn?: unknown; accessorKey?: unknown } }).columnDef?.accessorFn
    || (column as unknown as { columnDef?: { accessorFn?: unknown; accessorKey?: unknown } }).columnDef?.accessorKey);
  const canFilter = (column.getCanFilter?.() ?? false) && (hasAccessor || ((extraOptions || []).length > 0));
  if (!canFilter) return null;
  let faceted: Map<unknown, number> | undefined;
  try {
    faceted = column.getFacetedUniqueValues?.();
  } catch {
    faceted = undefined;
  }
  const values = faceted ? Array.from(faceted.keys()) : [];
  const providedOptions = Array.isArray(extraOptions) ? extraOptions : [];
  const isStores = column.id === "stores";
  const baseValues = isStores ? [] : values.map((v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v)));
  const unionValues = Array.from(new Set([
    ...baseValues,
    ...providedOptions,
  ]));
  const current = column.getFilterValue?.();
  const currentArr = Array.isArray(current) ? (current as unknown[]).map((v) => String(v as unknown as string)) : ((current == null ? [] : [String(current)]) as string[]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 w-8 p-0 ml-1 inline-flex items-center justify-center rounded-md transition-all duration-200 hover:bg-muted hover:shadow-sm active:scale-[0.98]"
          aria-label={t("filter")}
          data-testid={`user_products_filter_${column.id}_trigger`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit max-w-[92vw] p-2">
        <DropdownMenuItem disabled className="text-xs">{t("filter_values")}</DropdownMenuItem>
        <div className="p-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="h-7 w-auto min-w-32 pl-7 text-xs" data-testid={`user_products_filter_${column.id}_search`} />
          </div>
        </div>
        <div className="max-h-[12rem] max-w-[92vw] overflow-auto">
          {unionValues
            .filter((v) => String(v).toLowerCase().includes(query.toLowerCase()))
            .map((v) => {
              const id = String(v);
              const checked = currentArr.includes(id);
              return (
                <div key={id} className="flex items-center gap-2 px-2 py-1 whitespace-nowrap">
                  <input type="checkbox" checked={checked} onChange={(e) => {
                    const next = e.target.checked ? Array.from(new Set([...currentArr, id])) : currentArr.filter((x) => x !== id);
                    column.setFilterValue(next);
                  }} />
                  <span className="text-xs whitespace-nowrap" title={id}>{id}</span>
                </div>
              );
            })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
