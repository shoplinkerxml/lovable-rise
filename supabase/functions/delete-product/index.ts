import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { S3Client, DeleteObjectsCommand } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Body = { product_id?: string; productId?: string };

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

const extractObjectKeyFromUrl = (url: string) => {
  try {
    const u = new URL(url);
    const path = u.pathname || "";
    return path.startsWith("/") ? path.slice(1) : path;
  } catch (_) {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
    const rawId = body?.product_id ?? body?.productId ?? "";
    const productId = String(rawId || "");
    if (!productId) {
      return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(productId)) {
      return new Response(JSON.stringify({ error: "invalid_body", message: "product_id must be UUID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const { data: product, error: prodErr } = await supabase
      .from("store_products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();
    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "product_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: storeRow } = await supabase
      .from("user_stores")
      .select("id,user_id")
      .eq("id", String(product.store_id))
      .maybeSingle();
    if (!storeRow || String(storeRow.user_id) !== String(userId)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keys: string[] = [];
    if (accountId && bucket && accessKeyId && secretAccessKey) {
      const { data: imageRows } = await supabase
        .from("store_product_images")
        .select("url")
        .eq("product_id", productId);
      const s3 = new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
      try {
        for (const r of imageRows || []) {
          const u = String((r as { url?: string }).url || "");
          if (!u) continue;
          let host = "";
          try { host = new URL(u).host; } catch (_) { host = ""; }
          const isOurBucket = host === `${bucket}.${accountId}.r2.cloudflarestorage.com` || host === `shop-linker.9ea53eb0cc570bc4b00e01008dee35e6.r2.cloudflarestorage.com`;
          if (isOurBucket) {
            const key = extractObjectKeyFromUrl(u);
            if (key) keys.push(key);
          }
        }
        if (keys.length > 0) {
          const unique = Array.from(new Set(keys));
          await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: unique.map((k) => ({ Key: k })), Quiet: true } }));
        }
      } catch (r2Err) {
        return new Response(JSON.stringify({ error: "r2_delete_failed", message: (r2Err as { message?: string })?.message || "R2 delete failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    await supabase.from("store_product_params").delete().eq("product_id", productId);
    await supabase.from("store_product_images").delete().eq("product_id", productId);
    await supabase.from("store_product_links").delete().eq("product_id", productId);
    await supabase.from("store_products").delete().eq("id", productId);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as unknown as { message?: string })?.message ?? "Delete failed";
    return new Response(JSON.stringify({ error: "delete_failed", message: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});