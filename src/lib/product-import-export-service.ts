import { supabase } from "@/integrations/supabase/client";
import { R2Storage } from "@/lib/r2-storage";
import { SessionValidator } from "@/lib/session-validation";
import type { Product, ProductImage, ProductParam } from "@/lib/product-service";

export class ProductImportExportService {
  private static async invokeEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const { data: authData } = await supabase.auth.getSession();
    const accessToken: string | null = authData?.session?.access_token || null;
    const { data, error } = await supabase.functions.invoke<T | string>(name, {
      body,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (error) {
      const msg =
        (error as unknown as { message?: string } | null)?.message ||
        (error as unknown as { name?: string } | null)?.name ||
        "edge_invoke_failed";
      throw new Error(msg);
    }
    return typeof data === "string" ? (JSON.parse(data) as T) : (data as T);
  }

  static async getProductsEditDataBatch(
    productIds: string[],
    storeId?: string,
  ): Promise<Array<{ product: Product; images: ProductImage[]; params: ProductParam[] }>> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const ids = Array.from(new Set((productIds || []).map(String).map((s) => s.trim()).filter(Boolean)));
    if (ids.length === 0) return [];

    const chunkSize = 100;
    const byId = new Map<string, { product: Product; images: ProductImage[]; params: ProductParam[] }>();

    for (let i = 0; i < ids.length; i += chunkSize) {
      const part = ids.slice(i, i + chunkSize);
      const resp = await ProductImportExportService.invokeEdge<{
        items?: Array<{ product: Product; images?: unknown[]; params?: unknown[] }>;
      }>("product-export-data", { product_ids: part, store_id: storeId ?? null });

      const items = Array.isArray(resp?.items) ? resp.items : [];
      for (const it of items) {
        const pid = String(it?.product?.id || "");
        if (!pid) continue;

        const imagesRaw = Array.isArray(it?.images) ? it.images : [];
        const images: ProductImage[] = imagesRaw.map((img, idx) => {
          const raw = (img || {}) as Record<string, unknown>;
          const rawUrl = String(raw.url || "");
          const absolute = /^https?:\/\//i.test(rawUrl) ? rawUrl : "";
          const r2o = raw.r2_key_original != null ? String(raw.r2_key_original) : "";
          const resolved = absolute || (r2o ? R2Storage.makePublicUrl(r2o) : (rawUrl ? R2Storage.makePublicUrl(rawUrl) : ""));
          return {
            id: raw.id != null ? String(raw.id) : undefined,
            product_id: raw.product_id != null ? String(raw.product_id) : pid,
            url: resolved || rawUrl,
            order_index: typeof raw.order_index === "number" ? (raw.order_index as number) : idx,
            is_main: raw.is_main === true,
            alt_text: raw.alt_text != null ? String(raw.alt_text) : undefined,
          };
        });

        const paramsRaw = Array.isArray(it?.params) ? it.params : [];
        const params: ProductParam[] = paramsRaw.map((p, idx) => {
          const raw = (p || {}) as Record<string, unknown>;
          return {
            id: raw.id != null ? String(raw.id) : undefined,
            product_id: raw.product_id != null ? String(raw.product_id) : pid,
            name: String(raw.name || ""),
            value: String(raw.value || ""),
            order_index: typeof raw.order_index === "number" ? (raw.order_index as number) : idx,
            paramid: raw.paramid != null ? String(raw.paramid) : undefined,
            valueid: raw.valueid != null ? String(raw.valueid) : undefined,
          };
        });

        byId.set(pid, { product: it.product, images, params });
      }
    }

    return ids
      .map((id) => byId.get(String(id)))
      .filter(Boolean) as Array<{ product: Product; images: ProductImage[]; params: ProductParam[] }>;
  }
}
