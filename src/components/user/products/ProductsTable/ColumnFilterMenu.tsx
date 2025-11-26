import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";
import { useState } from "react";

export function ColumnFilterMenu({ column, extraOptions }: { column: import("@tanstack/react-table").Column<any, unknown>; extraOptions?: string[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const hasAccessor = Boolean((column as unknown as { columnDef?: { accessorFn?: unknown; accessorKey?: unknown } }).columnDef?.accessorFn
    || (column as unknown as { columnDef?: { accessorFn?: unknown; accessorKey?: unknown } }).columnDef?.accessorKey);
  const canFilter = (column.getCanFilter?.() ?? false) && hasAccessor;
  if (!canFilter) return null;
  let faceted: Map<unknown, number> | undefined;
  try {
    faceted = column.getFacetedUniqueValues?.();
  } catch {
    faceted = undefined;
  }
  const values = faceted ? Array.from(faceted.keys()) : [];
  const extraCategoryOptions = column.id === "category" ? (extraOptions || []) : [];
  const unionValues = Array.from(new Set([
    ...values.map((v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v))),
    ...extraCategoryOptions,
  ]));
  const current = column.getFilterValue?.();
  const currentArr = Array.isArray(current) ? (current as unknown[]).map((v) => String(v as unknown as string)) : ((current == null ? [] : [String(current)]) as string[]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="h-8 w-24 text-xs border rounded-md ml-1" data-testid={`user_products_filter_${column.id}_trigger`}>
          {t("filter")}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(16rem,92vw)] p-2">
        <DropdownMenuItem disabled className="text-xs">{t("filter_values")}</DropdownMenuItem>
        <div className="p-1">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search_placeholder")} className="h-8" data-testid={`user_products_filter_${column.id}_search`} />
        </div>
        <div className="max-h-[12rem] overflow-auto">
          {unionValues
            .filter((v) => String(v).toLowerCase().includes(query.toLowerCase()))
            .map((v) => {
              const id = String(v);
              const checked = currentArr.includes(id);
              return (
                <div key={id} className="flex items-center gap-2 px-2 py-1">
                  <input type="checkbox" checked={checked} onChange={(e) => {
                    const next = e.target.checked ? Array.from(new Set([...currentArr, id])) : currentArr.filter((x) => x !== id);
                    column.setFilterValue(next);
                  }} />
                  <span className="text-xs truncate" title={id}>{id}</span>
                </div>
              );
            })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
