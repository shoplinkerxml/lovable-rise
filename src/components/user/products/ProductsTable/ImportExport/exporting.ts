import type { Product, ProductAggregated, ProductImage, ProductParam } from "@/lib/product-service";
import { ProductService } from "@/lib/product-service";
import { ProductImportExportService } from "@/lib/product-import-export-service";
import { EXPORT_COLUMNS } from "./constants";
import { buildCsvFromRows } from "./csv";
import { buildXlsxBlobFromRows } from "./xlsx";

type ExportRow = Record<(typeof EXPORT_COLUMNS)[number], unknown>;

function asJsonString(v: unknown): string {
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function asNumberOrEmpty(v: unknown): number | "" {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
}

function asBoolean01OrEmpty(v: unknown): 0 | 1 | "" {
  if (v == null || v === "") return "";
  return v ? 1 : 0;
}

function toExportRow(args: {
  product: Product;
  images: ProductImage[];
  params: ProductParam[];
  linkedStoreIds?: string[];
}): ExportRow {
  const p = args.product;
  return {
    product_id: p.id,
    store_id: p.store_id,
    external_id: p.external_id,
    name: p.name,
    name_ua: p.name_ua ?? "",
    vendor: p.vendor ?? "",
    article: p.article ?? "",
    docket: p.docket ?? "",
    docket_ua: p.docket_ua ?? "",
    description: p.description ?? "",
    description_ua: p.description_ua ?? "",
    currency_code: p.currency_code ?? "",
    currency_id: p.currency_id ?? "",
    price: asNumberOrEmpty(p.price),
    price_old: asNumberOrEmpty(p.price_old),
    price_promo: asNumberOrEmpty(p.price_promo),
    stock_quantity: asNumberOrEmpty(p.stock_quantity),
    available: asBoolean01OrEmpty(p.available),
    state: p.state ?? "",
    category_id: asNumberOrEmpty(p.category_id),
    category_external_id: p.category_external_id ?? "",
    supplier_id: asNumberOrEmpty(p.supplier_id),
    is_active: asBoolean01OrEmpty(p.is_active ?? true),
    created_at: p.created_at ?? "",
    updated_at: p.updated_at ?? "",
    linked_store_ids: asJsonString(args.linkedStoreIds || []),
    images: asJsonString(args.images || []),
    params: asJsonString(args.params || []),
  };
}

export async function buildFullExportRows(args: {
  baseProducts: ProductAggregated[];
  storeId?: string | null;
}): Promise<ExportRow[]> {
  const base = args.baseProducts || [];
  const byId = new Map<string, ProductAggregated>();
  for (const p of base) {
    if (!p?.id) continue;
    byId.set(String(p.id), p);
  }
  const ids = Array.from(byId.keys());
  if (ids.length === 0) return [];

  const items = await ProductImportExportService.getProductsEditDataBatch(ids, args.storeId ? String(args.storeId) : undefined);
  const byDetailId = new Map<string, { product: Product; images: ProductImage[]; params: ProductParam[] }>();
  for (const it of items || []) {
    const pid = String(it?.product?.id || "");
    if (!pid) continue;
    byDetailId.set(pid, { product: it.product, images: it.images || [], params: it.params || [] });
  }

  const rows: ExportRow[] = [];
  for (const id of ids) {
    const d = byDetailId.get(String(id));
    if (!d) continue;
    const meta = byId.get(String(id));
    rows.push(
      toExportRow({
        product: d.product,
        images: d.images,
        params: d.params,
        linkedStoreIds: meta?.linkedStoreIds,
      }),
    );
  }
  return rows;
}

async function fetchAllBaseProducts(storeId: string | null): Promise<ProductAggregated[]> {
  const limit = 200;
  let offset = 0;
  let all: ProductAggregated[] = [];
  while (true) {
    const resp = await ProductService.getProductsPage(storeId, limit, offset);
    const pageProducts = Array.isArray(resp?.products) ? resp.products : [];
    all = [...all, ...pageProducts];
    const nextOffset = resp?.page?.nextOffset ?? null;
    const hasMore = !!resp?.page?.hasMore && nextOffset != null;
    if (!hasMore) break;
    offset = nextOffset;
  }
  return all;
}

export async function exportProducts(args: {
  format: "csv" | "xlsx";
  storeId: string | null;
  selectedProducts?: ProductAggregated[] | null;
}): Promise<{ mime: string; data: string | Blob }> {
  const selected = Array.isArray(args.selectedProducts) ? args.selectedProducts.filter(Boolean) : [];
  const baseProducts = selected.length > 0 ? selected : await fetchAllBaseProducts(args.storeId);
  const rows = await buildFullExportRows({ baseProducts, storeId: args.storeId });

  if (args.format === "csv") {
    return { mime: "text/csv;charset=utf-8", data: buildCsvFromRows(rows, EXPORT_COLUMNS) };
  }
  return {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    data: buildXlsxBlobFromRows(rows, EXPORT_COLUMNS, "products"),
  };
}
