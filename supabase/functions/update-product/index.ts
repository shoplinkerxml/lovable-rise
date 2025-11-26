import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { S3Client, CopyObjectCommand, GetObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const base64UrlToBase64 = (input: string) => input.replace(/-/g, "+").replace(/_/g, "/");
const decodeJwtSub = (authHeader: string | null) => {
  try {
    const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64UrlToBase64(parts[1])), c => c.charCodeAt(0))));
    return String(payload?.sub || payload?.user_id || "");
  } catch (_) {
    return null;
  }
};

function extractObjectKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host || "";
    const pathname = (u.pathname || "/").replace(/^\/+/, "");
    const parts = pathname.split("/").filter(Boolean);
    if (host.includes("cloudflarestorage.com")) {
      const hostParts = host.split(".");
      const isPathStyle = hostParts.length === 4;
      if (isPathStyle) {
        if (parts.length >= 2) return parts.slice(1).join("/");
        return parts[0] || null;
      }
      return pathname || null;
    }
    if (host.includes("r2.dev")) {
      if (parts.length >= 2) return parts.slice(1).join("/");
      return parts[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

type ImageInput = { key?: string; url?: string; order_index?: number; is_main?: boolean };
type ParamInput = { name: string; value: string; order_index?: number; paramid?: string | null; valueid?: string | null };
type Body = {
  product_id: string;
  supplier_id?: number | string | null;
  category_id?: string | null;
  category_external_id?: string | null;
  currency_code?: string | null;
  external_id?: string | null;
  name?: string;
  name_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  available?: boolean;
  stock_quantity?: number;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  description?: string | null;
  description_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  state?: string;
  images?: ImageInput[];
  params?: ParamInput[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = decodeJwtSub(auth);
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = (await req.json()) as Body;
    const productId = String(body?.product_id || "").trim();
    if (!productId) {
      return new Response(JSON.stringify({ error: "invalid_body", message: "product_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
    const bucket = Deno.env.get("R2_BUCKET_NAME") ?? "";
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "server_misconfig" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: productRow } = await supabase
      .from("store_products")
      .select("id,store_id,category_id,category_external_id")
      .eq("id", productId)
      .maybeSingle();
    if (!productRow) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const storeId = String((productRow as { store_id: string }).store_id);
    const { data: storeRow } = await supabase
      .from("user_stores")
      .select("id,user_id,is_active")
      .eq("id", storeId)
      .maybeSingle();
    if (!storeRow || String(storeRow.user_id) !== String(userId)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const isActive = (storeRow as { is_active?: boolean }).is_active;
    if (isActive === false) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const updateBase: Record<string, unknown> = {};
    if (body.supplier_id !== undefined) updateBase.supplier_id = body.supplier_id != null ? Number(body.supplier_id) : null;
    if (body.external_id !== undefined) updateBase.external_id = body.external_id;
    if (body.name !== undefined) updateBase.name = body.name;
    if (body.name_ua !== undefined) updateBase.name_ua = body.name_ua;
    if (body.docket !== undefined) updateBase.docket = body.docket;
    if (body.docket_ua !== undefined) updateBase.docket_ua = body.docket_ua;
    if (body.description !== undefined) updateBase.description = body.description;
    if (body.description_ua !== undefined) updateBase.description_ua = body.description_ua;
    if (body.vendor !== undefined) updateBase.vendor = body.vendor;
    if (body.article !== undefined) updateBase.article = body.article;
    if (body.category_id !== undefined) updateBase.category_id = body.category_id != null ? Number(body.category_id) : null;
    if (body.category_external_id !== undefined) {
      const raw = body.category_external_id;
      let nextExt: string | null = null;
      if (raw != null && String(raw).trim() !== "") {
        nextExt = String(raw);
      } else if (body.category_id != null) {
        const { data: catRow } = await supabase
          .from("store_categories")
          .select("external_id")
          .eq("id", Number(body.category_id))
          .maybeSingle();
        nextExt = (catRow as { external_id?: string } | null)?.external_id ?? null;
      } else {
        nextExt = (productRow as { category_external_id?: string } | null)?.category_external_id ?? null;
      }
      if (nextExt != null && String(nextExt).trim() !== "") {
        updateBase.category_external_id = String(nextExt);
      }
    }
    if (body.currency_code !== undefined) updateBase.currency_code = body.currency_code;
    if (body.price !== undefined) updateBase.price = body.price;
    if (body.price_old !== undefined) updateBase.price_old = body.price_old;
    if (body.price_promo !== undefined) updateBase.price_promo = body.price_promo;
    if (body.stock_quantity !== undefined) updateBase.stock_quantity = body.stock_quantity;
    if (body.available !== undefined) updateBase.available = body.available;
    if (body.state !== undefined) updateBase.state = body.state;

    if (Object.keys(updateBase).length > 0) {
      const { error: updErr } = await supabase
        .from("store_products")
        .update(updateBase)
        .eq("id", productId);
      if (updErr) {
        return new Response(JSON.stringify({ error: "update_failed", message: updErr.message || "Update failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const s3 = accountId && bucket && accessKeyId && secretAccessKey
      ? new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } })
      : null;
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const datePath = `${yyyy}/${mm}/${dd}`;

    try {
      if (Array.isArray(body.images)) {
        await supabase.from("store_product_images").delete().eq("product_id", productId);
        const images = body.images;
        const hasMain = images.some((i) => i.is_main === true);
        let assigned = false;
        const normalized = [] as Array<{ product_id: string; url: string; order_index: number; is_main: boolean }>;
        for (let index = 0; index < images.length; index++) {
          const img = images[index];
          let finalUrl = String(img.url || "");
          if (s3) {
            const srcKey = (img.key && String(img.key)) || (typeof img.url === "string" ? extractObjectKeyFromUrl(img.url) : null);
            if (srcKey) {
              const parts = srcKey.split("/").filter(Boolean);
              const baseName = parts[parts.length - 1] || "file";
              const cleanName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
              const suffix = crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
              const destKey = `uploads/products/${String(productId)}/${datePath}/${suffix}-${cleanName}`;
              try {
                await s3.send(new CopyObjectCommand({ Bucket: bucket, Key: destKey, CopySource: `${bucket}/${srcKey}` }));
                finalUrl = `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${destKey}`;
                const getCmd = new GetObjectCommand({ Bucket: bucket, Key: destKey });
                try { finalUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 }); } catch { }
              } catch (_) {
                finalUrl = String(img.url || "");
              }
            }
          }
          let m = img.is_main === true && !assigned;
          if (hasMain) {
            if (img.is_main === true && !assigned) assigned = true; else m = false;
          } else {
            m = index === 0;
          }
          if (finalUrl && finalUrl.trim() !== "") {
            normalized.push({ product_id: String(productId), url: finalUrl, order_index: typeof img.order_index === "number" ? img.order_index : index, is_main: m });
          }
        }
        const mainIdx = normalized.findIndex((i) => i.is_main === true);
        const ordered = (() => {
          const arr = normalized.slice();
          if (mainIdx > 0) {
            const [main] = arr.splice(mainIdx, 1);
            arr.unshift(main);
          }
          return arr.map((i, idx) => ({ ...i, order_index: idx }));
        })();
        if (ordered.length) {
          await supabase.from("store_product_images").insert(ordered);
        }
      }

      if (Array.isArray(body.params)) {
        await supabase.from("store_product_params").delete().eq("product_id", productId);
        const mapped = body.params.map((p, index) => ({ product_id: String(productId), name: p.name, value: p.value, order_index: typeof p.order_index === "number" ? p.order_index : index, paramid: p.paramid ?? null, valueid: p.valueid ?? null }));
        if (mapped.length) {
          await supabase.from("store_product_params").insert(mapped);
        }
      }
    } catch (subErr) {
      return new Response(JSON.stringify({ error: "update_failed", message: (subErr as { message?: string })?.message || "Update sub-ops failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ product_id: String(productId) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as unknown as { message?: string })?.message ?? "Update failed";
    return new Response(JSON.stringify({ error: "update_failed", message: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
