import * as XLSX from "xlsx";
import type { ExportColumn } from "./constants";

export async function readXlsxToRows(file: File): Promise<Array<Record<string, string>>> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const first = workbook.SheetNames?.[0];
  const sheet = first ? workbook.Sheets?.[first] : null;
  const parsed = sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" }) : [];
  return (parsed || []).map((obj) => {
    const r: Record<string, string> = {};
    for (const k of Object.keys(obj || {})) {
      r[k] = (obj as any)[k] == null ? "" : String((obj as any)[k]);
    }
    return r;
  });
}

export function buildXlsxBlobFromRows(rows: Array<Record<string, unknown>>, columns: readonly ExportColumn[], sheetName: string): Blob {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...columns] });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

