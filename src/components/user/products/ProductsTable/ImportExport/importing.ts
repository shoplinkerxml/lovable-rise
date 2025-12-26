import type { CreateProductData, ProductImage, ProductParam, UpdateProductData } from "@/lib/product-service";
import { ProductService } from "@/lib/product-service";
import { parseCsvRow } from "./csv";
import { readXlsxToRows } from "./xlsx";

export type ImportRow = {
  index: number;
  data: Record<string, string>;
  ok: boolean;
  errors: string[];
};

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
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return undefined;
}

function parseJsonArrayMaybe<T>(raw: string | undefined): T[] | null | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  try {
    const parsed = JSON.parse(s) as unknown;
    if (Array.isArray(parsed)) return parsed as T[];
    return null;
  } catch {
    return null;
  }
}

function parseLinkedStoreIds(raw: string | undefined): string[] | null | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const asJson = parseJsonArrayMaybe<unknown>(s);
  if (asJson === null) {
    const parts = s.split(/[,;\s]+/).map((p) => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts : [];
  }
  if (asJson === undefined) return undefined;
  return (asJson || []).map((v) => String(v)).filter(Boolean);
}

export function validateImportRows(
  rows: Array<Record<string, string>>,
  t: (k: string) => string,
  effectiveStoreId: string | null,
): ImportRow[] {
  const out: ImportRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const errors: string[] = [];
    const rowStoreId = String(r.store_id || "").trim();
    if (effectiveStoreId && rowStoreId && rowStoreId !== effectiveStoreId) {
      errors.push(t("import_export_store_mismatch"));
    }
    const externalId = String(r.external_id || "").trim();
    const name = String(r.name || "").trim();
    if (!externalId) errors.push(t("import_export_missing_external_id"));
    if (!name) errors.push(t("import_export_missing_name"));

    const imagesRaw = r.images;
    const imagesParsed = parseJsonArrayMaybe<unknown>(imagesRaw);
    if (imagesParsed === null) errors.push(t("import_export_invalid_images"));

    const paramsRaw = r.params;
    const paramsParsed = parseJsonArrayMaybe<unknown>(paramsRaw);
    if (paramsParsed === null) errors.push(t("import_export_invalid_params"));

    out.push({ index: i, data: r, ok: errors.length === 0, errors });
  }
  return out;
}

export async function readImportFileToRows(file: File): Promise<Array<Record<string, string>>> {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".xlsx")) {
    return await readXlsxToRows(file);
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

export function mapRowToCreateOrUpdate(
  d: Record<string, string>,
  effectiveStoreId: string | null,
): {
  productId: string;
  base: Record<string, unknown>;
  images?: ProductImage[];
  params?: ProductParam[];
  linkedStoreIds?: string[];
} {
  const productId = String(d.product_id || "").trim();

  const imagesRaw = d.images;
  const imagesJson = parseJsonArrayMaybe<unknown>(imagesRaw);
  const images: ProductImage[] | undefined =
    imagesJson && Array.isArray(imagesJson)
      ? (imagesJson as unknown[]).map((img, idx) => {
          const obj = (img || {}) as Record<string, unknown>;
          return {
            url: String(obj.url ?? ""),
            order_index: typeof obj.order_index === "number" ? (obj.order_index as number) : idx,
            is_main: obj.is_main === true,
            alt_text: obj.alt_text != null ? String(obj.alt_text) : undefined,
          };
        }).filter((i) => !!String(i.url || "").trim())
      : undefined;

  const paramsRaw = d.params;
  const paramsJson = parseJsonArrayMaybe<unknown>(paramsRaw);
  const params: ProductParam[] | undefined =
    paramsJson && Array.isArray(paramsJson)
      ? (paramsJson as unknown[]).map((p, idx) => {
          const obj = (p || {}) as Record<string, unknown>;
          return {
            name: String(obj.name ?? ""),
            value: String(obj.value ?? ""),
            order_index: typeof obj.order_index === "number" ? (obj.order_index as number) : idx,
            paramid: obj.paramid != null ? String(obj.paramid) : undefined,
            valueid: obj.valueid != null ? String(obj.valueid) : undefined,
          };
        }).filter((p) => !!String(p.name || "").trim())
      : undefined;

  const linkedStoreIds = parseLinkedStoreIds(d.linked_store_ids) ?? undefined;

  const base: Record<string, unknown> = {
    ...(effectiveStoreId ? { store_id: effectiveStoreId } : {}),
    external_id: String(d.external_id || "").trim(),
    name: String(d.name || "").trim(),
    name_ua: asNullableString(d.name_ua) ?? undefined,
    vendor: asNullableString(d.vendor) ?? undefined,
    article: asNullableString(d.article) ?? undefined,
    docket: asNullableString(d.docket) ?? undefined,
    docket_ua: asNullableString(d.docket_ua) ?? undefined,
    description: asNullableString(d.description) ?? undefined,
    description_ua: asNullableString(d.description_ua) ?? undefined,
    currency_code: asNullableString(d.currency_code) ?? undefined,
    category_id: asNullableNumber(d.category_id) ?? undefined,
    category_external_id: asNullableString(d.category_external_id) ?? undefined,
    supplier_id: asNullableNumber(d.supplier_id) ?? undefined,
    price: asNullableNumber(d.price) ?? undefined,
    price_old: asNullableNumber(d.price_old) ?? undefined,
    price_promo: asNullableNumber(d.price_promo) ?? undefined,
    stock_quantity: asNullableNumber(d.stock_quantity) ?? undefined,
    available: asNullableBoolean(d.available) ?? undefined,
    state: asNullableString(d.state) ?? undefined,
    images,
    params,
  };

  return { productId, base, images, params, linkedStoreIds };
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

  await mapWithConcurrency(rows, 3, async (r) => {
    const d = r.data || {};
    const mapped = mapRowToCreateOrUpdate(d, args.effectiveStoreId);
    const productId = mapped.productId;

    if (!productId) {
      const unique = Array.from(new Set((mapped.linkedStoreIds || []).map(String).filter(Boolean)));
      const base = mapped.base as unknown as CreateProductData;
      const createPayload: CreateProductData =
        unique.length > 0 ? { ...base, links: unique.map((storeId) => ({ store_id: storeId })) } : base;
      await ProductService.createProduct(createPayload);
      created += 1;
      return;
    }

    const patch = mapped.base as unknown as UpdateProductData;
    await ProductService.updateProduct(productId, patch);
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
