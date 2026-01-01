import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { QueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProductAggregated } from "@/lib/product-service";
import type { ProductRow } from "./columns";
import { exportProducts } from "./ImportExport/exporting";
import { downloadBlob, downloadText } from "./ImportExport/file";
import { formatTokens } from "./ImportExport/format";
import { PRODUCTS_SHEET_NAME } from "./ImportExport/constants";
import { importProducts, readImportFile, type ImportRow, validateImportRows } from "./ImportExport/importing";

export function ImportExportDialog({
  open,
  onOpenChange,
  t,
  storeId,
  userId,
  queryClient,
  selectedProducts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (k: string) => string;
  storeId?: string;
  userId?: string | null;
  queryClient: QueryClient;
  selectedProducts?: ProductRow[];
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"export" | "import">("export");

  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const effectiveStoreId = storeId ? String(storeId) : null;

  const previewRows = useMemo(() => importRows.slice(0, 20), [importRows]);
  const errorsCount = useMemo(() => importRows.reduce((acc, r) => acc + (r.ok ? 0 : 1), 0), [importRows]);

  const processFile = useCallback(async (file: File) => {
    try {
      const { products } = await readImportFile(file);
      const validated = validateImportRows(products, t).map((r) => ({
        ...r,
        data: { ...r.data, __sheet: PRODUCTS_SHEET_NAME },
      }));
      setImportRows(validated);
    } catch {
      setImportRows([]);
    }
  }, [t]);

  const onPickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(async (e) => {
    const f = e.target.files?.[0] || null;
    e.currentTarget.value = "";
    if (!f) return;
    await processFile(f);
  }, [processFile]);

  const runExport = useCallback(async (format: "csv" | "xlsx") => {
    setExporting(true);
    try {
      const selected = (selectedProducts || []).filter(Boolean);
      const selectedAgg: ProductAggregated[] = selected.length > 0 ? (selected as unknown as ProductAggregated[]) : [];
      const res = await exportProducts({ format, storeId: effectiveStoreId, selectedProducts: selectedAgg });
      const scope = effectiveStoreId ? `store-${effectiveStoreId}` : "user";
      const filename = selected.length > 0 ? `products-${scope}-selected-${Date.now()}.${format}` : `products-${scope}-${Date.now()}.${format}`;
      if (typeof res.data === "string") {
        await downloadText(res.data, filename, res.mime);
      } else {
        await downloadBlob(res.data, filename);
      }
      toast.success(t("import_export_exported"));
    } catch {
      toast.error(t("operation_failed"));
    } finally {
      setExporting(false);
    }
  }, [effectiveStoreId, selectedProducts, t]);

  const runImport = useCallback(async () => {
    if (importing) return;
    if (importRows.length === 0) return;
    if (errorsCount > 0) {
      toast.error(t("import_export_fix_errors"));
      return;
    }

    setImporting(true);
    try {
      const { created, skipped } = await importProducts({ rows: importRows, effectiveStoreId });
      const uid = userId ? String(userId) : "current";
      queryClient.invalidateQueries({ queryKey: ["user", uid, "products"], exact: false });
      const msg = formatTokens(t("import_export_import_done"), { created, skipped });
      toast.success(msg);
      setImportRows([]);
      onOpenChange(false);
    } catch {
      toast.error(t("operation_failed"));
      const uid = userId ? String(userId) : "current";
      queryClient.invalidateQueries({ queryKey: ["user", uid, "products"], exact: false });
    } finally {
      setImporting(false);
    }
  }, [importing, effectiveStoreId, importRows, errorsCount, t, queryClient, onOpenChange, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(56rem,92vw)] max-h-[90vh] flex flex-col gap-0 p-0"
        data-testid="user_products_import_export_dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{t("import_export_title")}</DialogTitle>
          <DialogDescription className="text-sm">
            {t("import_export_export_hint")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v === "import" ? "import" : "export")}>
            <TabsList className="w-fit max-w-full flex flex-wrap sm:flex-nowrap sm:w-auto sm:inline-flex">
              <TabsTrigger value="export">{t("export")}</TabsTrigger>
              <TabsTrigger value="import">{t("import")}</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="mt-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={exporting}
                  aria-disabled={exporting}
                  onClick={() => void runExport("csv")}
                  data-testid="user_products_export_csv"
                >
                  CSV
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={exporting}
                  aria-disabled={exporting}
                  onClick={() => void runExport("xlsx")}
                  data-testid="user_products_export_xlsx"
                >
                  XLSX
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="mt-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importing}
                    aria-disabled={importing}
                    onClick={onPickFile}
                    data-testid="user_products_import_pick_file"
                    className="flex-shrink-0"
                  >
                    {t("import_export_select_file")}
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.xlsx" onChange={onFileChange} />
                  {importRows.length > 0 ? (
                    <div className="text-xs sm:text-sm text-muted-foreground break-words">
                      {formatTokens(t("import_export_preview_rows"), { count: importRows.length })} · {formatTokens(t("import_export_errors_count"), { count: errorsCount })}
                    </div>
                  ) : null}
                </div>

                {importRows.length > 0 ? (
                  <div className="rounded-md border">
                    <div className="h-[min(18rem,45vh)] overflow-auto">
                      <div className="min-w-[44rem]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[5rem]">#</TableHead>
                              <TableHead className="w-[10rem]">ID</TableHead>
                              <TableHead className="w-[12rem]">{t("external_id")}</TableHead>
                              <TableHead>{t("table_product")}</TableHead>
                              <TableHead className="w-[10rem]">{t("import_export_row_status")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewRows.map((r) => (
                              <TableRow key={r.index}>
                                <TableCell className="text-muted-foreground">{r.index + 1}</TableCell>
                                <TableCell>
                                  {String(r.data.ID || r.data["Product ID"] || r.data.product_id || r.data.productId || r.data.id || "")}
                                </TableCell>
                                <TableCell>
                                  {String(r.data["External ID"] || r.data["Зовнішній ID"] || r.data["Внешний ID"] || r.data.external_id || "")}
                                </TableCell>
                                <TableCell className="truncate max-w-[22rem]">
                                  {String(r.data["Name"] || r.data["Назва"] || r.data["Название"] || r.data.name || "")}
                                </TableCell>
                                <TableCell>
                                  {r.ok ? (
                                    <span className="text-emerald-600">{t("import_export_row_ok")}</span>
                                  ) : (
                                    <span className="text-destructive">{r.errors.join("; ")}</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {t("import_export_preview_limit")}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Input readOnly value="CSV/XLSX" className="max-w-[10rem]" />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="user_products_import_export_close"
            className="w-full sm:w-auto"
          >
            {t("close")}
          </Button>
          {tab === "import" ? (
            <Button
              type="button"
              disabled={importing || importRows.length === 0}
              aria-disabled={importing || importRows.length === 0}
              onClick={() => void runImport()}
              data-testid="user_products_import_run"
              className="w-full sm:w-auto"
            >
              {t("import")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
