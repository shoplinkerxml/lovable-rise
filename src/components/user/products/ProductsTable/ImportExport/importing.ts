import type { CreateProductData, ProductParam, UpdateProductData } from "@/lib/product-service";
import { ProductService } from "@/lib/product-service";
import { parseCsvRow } from "./csv";
import { readXlsxToSheets } from "./xlsx";
import { PARAMS_SHEET_NAME, PRODUCTS_SHEET_NAME } from "./constants";

export type ImportRow = {
  index: number;
  data: Record<string, string>;
  ok: boolean;
  errors: string[];
};

function normalizeStr(v: string | undefined): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function parseProductStateLegacy(v: string | undefined): string | undefined {
  const s = normalizeStr(v);
  if (!s) return undefined;
  if (["new", "stock", "used", "refurbished", "archived"].includes(s)) return s;
  if (["новий", "новый"].includes(s)) return "new";
  if (["уцінений", "уцененный"].includes(s)) return "stock";
  if (["вживаний", "б/у", "бу"].includes(s)) return "used";
  if (["відновлений", "восстановленный"].includes(s)) return "refurbished";
  if (["архівний", "архивный"].includes(s)) return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  if (s === "new") return "new";
  if (s === "stock") return "stock";
  if (s === "used") return "used";
  if (s === "refurbished") return "refurbished";
  if (s === "archived") return "archived";
  return undefined;
}

function parseProductState(v: string | undefined): string | undefined {
  const s = normalizeStr(v);
  if (!s) return undefined;
  if (["new", "stock", "used", "refurbished", "archived"].includes(s)) return s;
  if (["новий", "новый"].includes(s)) return "new";
  if (["уцінений", "уцененный"].includes(s)) return "stock";
  if (["вживаний", "б/у", "бу"].includes(s)) return "used";
  if (["відновлений", "восстановленный"].includes(s)) return "refurbished";
  if (["архівний", "архивный"].includes(s)) return "archived";
  return undefined;
}

function extractParamsFromProductRow(d: Record<string, string>): { hasParamColumns: boolean; params: ProductParam[] } {
  const keys = Object.keys(d || {});
  let maxIndex = 0;
  let has = false;

  for (const k of keys) {
    const m = /^(Характеристика|Characteristic|Значення|Value|Значение)\s+(\d+)$/i.exec(String(k || "").trim());
    if (!m) continue;
    const idx = Number(m[2]);
    if (!Number.isFinite(idx) || idx <= 0) continue;
    has = true;
    if (idx > maxIndex) maxIndex = idx;
  }

  const params: ProductParam[] = [];
  for (let i = 1; i <= maxIndex; i++) {
    const name = String(readCell(d, [`Характеристика ${i}`, `Characteristic ${i}`])).trim();
    const value = String(readCell(d, [`Значення ${i}`, `Value ${i}`, `Значение ${i}`])).trim();
    if (!name) continue;
    params.push({ name, value, order_index: params.length });
  }

  return { hasParamColumns: has, params };
}

function asNullableNumber(v: string | undefined): number | null | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function asNullableString(v: string | undefined): string | null | undefined {
  if (v == null) return undefined;
  const s = String(v);
  if (!s.trim()) return undefined;
  return s;
}

function asNullableBoolean(v: string | undefined): boolean | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  if (["1", "true", "yes", "y", "так", "да"].includes(s)) return true;
  if (["0", "false", "no", "n", "ні", "нет"].includes(s)) return false;
  return undefined;
}

function readCell(d: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(d, k)) {
      const raw = d[k];
      if (raw != null && String(raw).trim() !== "") return String(raw);
    }
  }
  const k0 = keys[0];
  if (k0 && Object.prototype.hasOwnProperty.call(d, k0)) return String(d[k0] ?? "");
  return "";
}

export function validateImportRows(rows: Array<Record<string, string>>, t: (k: string) => string): ImportRow[] {
  const out: ImportRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const errors: string[] = [];

    const externalId = String(readCell(r, ["Зовнішній ID", "External ID", "Внешний ID", "external_id"])).trim();
    const name = String(readCell(r, ["Name", "Назва", "Название", "name"])).trim();
    if (!externalId) errors.push(t("import_export_missing_external_id"));
    if (!name) errors.push(t("import_export_missing_name"));

    out.push({ index: i, data: r, ok: errors.length === 0, errors });
  }
  return out;
}

export async function readImportFileToRows(file: File): Promise<Array<Record<string, string>>> {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".xlsx")) {
    const sheets = await readXlsxToSheets(file);
    const products = sheets[PRODUCTS_SHEET_NAME] || sheets[Object.keys(sheets)[0] || ""] || [];
    return products;
  }
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = parseCsvRow(lines[0]).map((h) => h.trim());
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);
      const r: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        const key = String(headers[j] || "").trim();
        if (!key) continue;
        r[key] = cols[j] == null ? "" : String(cols[j]);
      }
      rows.push(r);
    }
    return rows;
  }
  return [];
}

export async function readImportFile(file: File): Promise<{
  products: Array<Record<string, string>>;
  params: Array<Record<string, string>>;
}> {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".xlsx")) {
    const sheets = await readXlsxToSheets(file);
    const products = sheets[PRODUCTS_SHEET_NAME] || [];
    const params = sheets[PARAMS_SHEET_NAME] || [];
    return { products, params };
  }
  const products = await readImportFileToRows(file);
  return { products, params: [] };
}

export function mapProductRowToBase(
  d: Record<string, string>,
  effectiveStoreId: string | null,
  lookups: {
    suppliers: Array<{ id: string; supplier_name: string }>;
    supplierCategoriesMap: Record<string, Array<{ id: string; name: string; external_id: string; supplier_id: string }>>;
  },
): {
  externalId: string;
  base: Record<string, unknown>;
} {
  const externalId = String(readCell(d, ["Зовнішній ID", "External ID", "Внешний ID", "external_id"])).trim();
  const supplierName = String(readCell(d, ["Supplier", "Постачальник", "Поставщик", "supplier"])).trim();
  const categoryName = String(readCell(d, ["Category", "Категорія", "Категория", "category"])).trim();

  const supplierRow = supplierName
    ? lookups.suppliers.find((s) => String(s.supplier_name || "").trim().toLowerCase() === supplierName.toLowerCase())
    : undefined;
  const supplierId = supplierRow?.id ? Number(String(supplierRow.id)) : undefined;

  let categoryId: number | undefined = undefined;
  if (categoryName) {
    const maps = lookups.supplierCategoriesMap || {};
    const categories = supplierId != null && Number.isFinite(supplierId) ? (maps[String(supplierId)] || []) : Object.values(maps).flat();
    const found = categories.find((c) => String(c.name || "").trim().toLowerCase() === categoryName.toLowerCase());
    if (found?.id != null && String(found.id).trim() !== "") {
      const n = Number(String(found.id));
      if (Number.isFinite(n)) categoryId = n;
    }
  }

  const nameValue = asNullableString(readCell(d, ["Name", "Название", "name"])) ?? undefined;
  const nameUaValue = asNullableString(readCell(d, ["Назва", "Название (UA)", "name_ua"])) ?? undefined;
  const shortValue = asNullableString(readCell(d, ["Short Description", "Короткое описание", "docket"])) ?? undefined;
  const shortUaValue = asNullableString(readCell(d, ["Короткий опис", "Короткое описание (UA)", "docket_ua"])) ?? undefined;
  const descValue = asNullableString(readCell(d, ["Description", "Описание", "description"])) ?? undefined;
  const descUaValue = asNullableString(readCell(d, ["Опис", "Описание (UA)", "description_ua"])) ?? undefined;

  const stateRaw = asNullableString(readCell(d, ["Status", "Стан", "Состояние", "state"])) ?? undefined;
  const stateParsed = stateRaw ? parseProductState(stateRaw) : undefined;

  const base: Record<string, unknown> = {
    ...(effectiveStoreId ? { store_id: effectiveStoreId } : {}),
    external_id: externalId,
    name: String(nameValue || nameUaValue || "").trim(),
    name_ua: nameUaValue ?? undefined,
    vendor: asNullableString(readCell(d, ["Brand", "Бренд", "vendor"])) ?? undefined,
    article: asNullableString(readCell(d, ["Article", "Артикул", "article"])) ?? undefined,
    docket: shortValue ?? shortUaValue ?? undefined,
    docket_ua: shortUaValue ?? undefined,
    description: descValue ?? descUaValue ?? undefined,
    description_ua: descUaValue ?? undefined,
    currency_code: asNullableString(readCell(d, ["Currency", "Валюта", "currency_code"])) ?? undefined,
    category_id: categoryId,
    supplier_id: supplierId != null && Number.isFinite(supplierId) ? supplierId : undefined,
    price: asNullableNumber(readCell(d, ["Price", "Ціна", "Цена", "price"])) ?? undefined,
    price_old: asNullableNumber(readCell(d, ["Old Price", "Стара ціна", "Старая цена", "price_old"])) ?? undefined,
    price_promo: asNullableNumber(readCell(d, ["Promo Price", "Акційна ціна", "Акционная цена", "price_promo"])) ?? undefined,
    stock_quantity: asNullableNumber(readCell(d, ["Stock", "Залишок", "Остаток", "stock_quantity"])) ?? undefined,
    available: asNullableBoolean(readCell(d, ["Available", "В наявності", "В наличии", "available"])) ?? undefined,
    state: stateParsed ?? undefined,
    is_active: asNullableBoolean(readCell(d, ["Active", "Активний", "Активен", "is_active"])) ?? undefined,
  };

  return { externalId, base };
}

export function mapParamsRowsToByExternalId(
  rows: Array<Record<string, string>>,
): Record<string, ProductParam[]> {
  const out: Record<string, ProductParam[]> = {};
  for (const r of rows || []) {
    const externalId = String(readCell(r, ["external_id", "External ID", "Зовнішній ID", "Внешний ID"])).trim();
    if (!externalId) continue;
    const name = String(readCell(r, ["param_name", "Характеристика", "Characteristic"])).trim();
    const value = String(readCell(r, ["param_value", "Значення", "Значение", "Value"])).trim();
    if (!name) continue;
    if (!out[externalId]) out[externalId] = [];
    out[externalId].push({ name, value, order_index: out[externalId].length });
  }
  return out;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  const chunk = Math.max(1, Math.floor(limit));
  for (let i = 0; i < items.length; i += chunk) {
    const part = items.slice(i, i + chunk);
    const res = await Promise.all(part.map((it, idx) => fn(it, i + idx)));
    out.push(...res);
  }
  return out;
}

export async function processImportBatch(args: {
  rows: ImportRow[];
  effectiveStoreId: string | null;
}): Promise<{ created: number; skipped: number }> {
  const rows = args.rows || [];
  let created = 0;
  let skipped = 0;

  const lookups = await ProductService.getUserLookups();
  const existingByExternalId = new Map<string, string>();
  {
    const limit = 200;
    let offset = 0;
    while (true) {
      const resp = await ProductService.getProductsPage(args.effectiveStoreId, limit, offset);
      const list = Array.isArray(resp?.products) ? resp.products : [];
      for (const p of list) {
        const ex = String((p as any)?.external_id || "").trim();
        const id = String((p as any)?.id || "").trim();
        if (ex && id) existingByExternalId.set(ex, id);
      }
      const nextOffset = resp?.page?.nextOffset ?? null;
      const hasMore = !!resp?.page?.hasMore && nextOffset != null;
      if (!hasMore) break;
      offset = nextOffset;
      if (existingByExternalId.size > 5000) break;
    }
  }

  const paramsByExternalId = mapParamsRowsToByExternalId(
    rows
      .filter((r) => r.data?.__sheet === PARAMS_SHEET_NAME)
      .map((r) => r.data as Record<string, string>),
  );

  await mapWithConcurrency(rows, 3, async (r) => {
    const d = r.data || {};
    if (String((d as any)?.__sheet || "") === PARAMS_SHEET_NAME) return;

    const mapped = mapProductRowToBase(d, args.effectiveStoreId, {
      suppliers: lookups.suppliers || [],
      supplierCategoriesMap: lookups.supplierCategoriesMap || {},
    });
    const externalId = mapped.externalId;
    const existingId = externalId ? existingByExternalId.get(externalId) : undefined;

    const fromProductRow = extractParamsFromProductRow(d);
    const fromParamsSheet = paramsByExternalId[externalId];
    const params = fromProductRow.hasParamColumns ? fromProductRow.params : fromParamsSheet ?? undefined;

    if (!existingId) {
      const base = mapped.base as unknown as CreateProductData;
      const createPayload: CreateProductData = params ? { ...base, params } : base;
      await ProductService.createProduct(createPayload);
      created += 1;
      return;
    }

    const patch = mapped.base as unknown as UpdateProductData;
    const patchWithParams: UpdateProductData = params ? { ...patch, params } : patch;
    await ProductService.updateProduct(existingId, patchWithParams);
    skipped += 1;
  });

  return { created, skipped };
}

export async function importProducts(args: {
  rows: ImportRow[];
  effectiveStoreId: string | null;
}): Promise<{ created: number; skipped: number }> {
  return await processImportBatch({ rows: args.rows, effectiveStoreId: args.effectiveStoreId });
}
