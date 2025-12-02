import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js"
import { S3Client, CopyObjectCommand } from "npm:@aws-sdk/client-s3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
}

const base64UrlToBase64 = (input: string) =>
  input.replace(/-/g, "+").replace(/_/g, "/")

const decodeJwtSub = (authHeader: string | null) => {
  try {
    const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim()
    const parts = token.split(".")
    if (parts.length < 2) return null
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(base64UrlToBase64(parts[1])), (c) =>
          c.charCodeAt(0),
        ),
      ),
    )
    return String(payload?.sub || payload?.user_id || "")
  } catch {
    return null
  }
}

function extractObjectKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.host || ""
    const pathname = (u.pathname || "/").replace(/^\/+/, "")
    const parts = pathname.split("/").filter(Boolean)

    if (host.includes("cloudflarestorage.com")) {
      const hostParts = host.split(".")
      const isPathStyle = hostParts.length === 4
      if (isPathStyle) {
        if (parts.length >= 2) return parts.slice(1).join("/")
        return parts[0] || null
      }
      return pathname || null
    }

    if (host.includes("r2.dev")) {
      if (parts.length >= 2) return parts.slice(1).join("/")
      return parts[0] || null
    }

    return null
  } catch {
    return null
  }
}

type ImageInput = {
  key?: string
  url?: string
  order_index?: number
  is_main?: boolean
}

type ParamInput = {
  name: string
  value: string
  order_index?: number
  paramid?: string | null
  valueid?: string | null
}

type Body = {
  product_id: string
  supplier_id?: number | string | null
  category_id?: string | null
  category_external_id?: string | null
  currency_code?: string | null
  external_id?: string | null
  name?: string
  name_ua?: string | null
  vendor?: string | null
  article?: string | null
  available?: boolean
  stock_quantity?: number
  price?: number | null
  price_old?: number | null
  price_promo?: number | null
  description?: string | null
  description_ua?: string | null
  docket?: string | null
  docket_ua?: string | null
  state?: string
  images?: ImageInput[]
  params?: ParamInput[]
}

// ENV и клиенты один раз
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? ""
const bucket = Deno.env.get("R2_BUCKET_NAME") ?? ""
const IMAGE_BASE_URL = Deno.env.get("IMAGE_BASE_URL") ?? ""
const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? ""
const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? ""

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing Supabase configuration")
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const s3 =
  accountId && bucket && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      })
    : null

function buildDatePath() {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(now.getUTCDate()).padStart(2, "0")
  return `${yyyy}/${mm}/${dd}`
}

async function toPreferredUrl(img: ImageInput): Promise<{ url: string; r2_card?: string; r2_thumb?: string; r2_original?: string }> {
  const srcKey = (img.key && String(img.key)) || (typeof img.url === "string" ? extractObjectKeyFromUrl(img.url!) : null)
  const k = srcKey ? String(srcKey) : ""
  let cardKey = ""
  let thumbKey = ""
  let originalKey = ""
  if (k) {
    if (k.endsWith("/card.webp")) {
      cardKey = k
      thumbKey = k.replace("/card.webp", "/thumb.webp")
      originalKey = k.replace("/card.webp", "/original.webp")
    } else if (k.endsWith("/thumb.webp")) {
      thumbKey = k
      cardKey = k.replace("/thumb.webp", "/card.webp")
      originalKey = k.replace("/thumb.webp", "/original.webp")
    } else if (k.endsWith("/original.webp")) {
      originalKey = k
      cardKey = k.replace("/original.webp", "/card.webp")
      thumbKey = k.replace("/original.webp", "/thumb.webp")
    }
  }
  const base = IMAGE_BASE_URL || ""
  const preferred = base && cardKey ? `${base}/${cardKey}` : String(img.url || "").trim()
  return { url: preferred, r2_card: cardKey || undefined, r2_thumb: thumbKey || undefined, r2_original: originalKey || undefined }
}

async function handleImages(
  productId: string,
  images: ImageInput[] | undefined,
): Promise<void> {
  if (!Array.isArray(images) || images.length === 0) {
    await supabase.from("store_product_images").delete().eq("product_id", productId)
    return
  }
  const { data: existingRows } = await supabase
    .from("store_product_images")
    .select("id,product_id,url,order_index,is_main,alt_text,r2_key_card,r2_key_thumb,r2_key_original")
    .eq("product_id", productId)
    .order("order_index")

  const existing = (existingRows || []) as any[]
  const mapByKey = new Map<string, any>()
  for (const r of existing) {
    const kc = r?.r2_key_card ? String(r.r2_key_card) : ""
    const kt = r?.r2_key_thumb ? String(r.r2_key_thumb) : ""
    if (kc) mapByKey.set(kc, r)
    if (kt) mapByKey.set(kt, r)
  }

  const updates: any[] = []
  const inserts: any[] = []

  let hasMain = images.some((i) => i.is_main === true)
  let assigned = false

  for (let index = 0; index < images.length; index++) {
    const raw = images[index]
    const preferred = await toPreferredUrl(raw)
    const keyCandidate = (raw.key && String(raw.key)) || (typeof raw.url === "string" ? extractObjectKeyFromUrl(raw.url!) : null) || ""
    const match = keyCandidate ? mapByKey.get(String(keyCandidate)) : null
    let isMain = raw.is_main === true && !assigned
    if (hasMain) {
      if (raw.is_main === true && !assigned) assigned = true
      else isMain = false
    } else {
      isMain = index === 0
    }
    const oi = typeof raw.order_index === "number" ? raw.order_index : index
    if (match && match.id != null) {
      updates.push({ id: match.id, url: preferred.url, is_main: isMain, order_index: oi })
    } else {
      inserts.push({ product_id: productId, url: preferred.url, is_main: isMain, order_index: oi, r2_key_card: preferred.r2_card ?? null, r2_key_thumb: preferred.r2_thumb ?? null, r2_key_original: preferred.r2_original ?? null })
    }
  }

  const mainIdx = updates.findIndex((i) => i.is_main === true)
  if (mainIdx > 0) {
    const [main] = updates.splice(mainIdx, 1)
    updates.unshift(main)
  }
  for (let i = 0; i < updates.length; i++) updates[i].order_index = i
  const start = updates.length
  for (let i = 0; i < inserts.length; i++) inserts[i].order_index = start + i

  if (updates.length) {
    await supabase.from("store_product_images").upsert(updates, { onConflict: "id" })
  }
  if (inserts.length) {
    await supabase.from("store_product_images").insert(inserts)
  }
  const keptIds = new Set<string>(updates.map((u) => String(u.id)))
  const toDelete = existing.filter((r) => !keptIds.has(String(r.id)))
  if (toDelete.length) {
    await supabase.from("store_product_images").delete().in("id", toDelete.map((r) => r.id))
  }
}

async function handleParams(
  productId: string,
  params: ParamInput[] | undefined,
): Promise<void> {
  await supabase.from("store_product_params").delete().eq("product_id", productId)
  if (!Array.isArray(params) || params.length === 0) return

  const mapped = params.map((p, index) => ({
    product_id: productId,
    name: p.name,
    value: p.value,
    order_index:
      typeof p.order_index === "number" ? p.order_index : index,
    paramid: p.paramid ?? null,
    valueid: p.valueid ?? null,
  }))

  if (mapped.length) {
    await supabase.from("store_product_params").insert(mapped)
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers: jsonHeaders },
    )
  }

  try {
    const auth = req.headers.get("authorization")
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      })
    }

    const userId = decodeJwtSub(auth)
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const productId = String(body?.product_id || "").trim()
    if (!productId) {
      return new Response(
        JSON.stringify({
          error: "invalid_body",
          message: "product_id required",
        }),
        { status: 400, headers: jsonHeaders },
      )
    }

    const { data: productRow } = await supabase
      .from("store_products")
      .select("id,store_id,category_id,category_external_id")
      .eq("id", productId)
      .maybeSingle()

    if (!productRow) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: jsonHeaders,
      })
    }

    const storeId = String((productRow as { store_id: string }).store_id)

    const { data: storeRow } = await supabase
      .from("user_stores")
      .select("id,user_id,is_active")
      .eq("id", storeId)
      .maybeSingle()

    if (!storeRow || String(storeRow.user_id) !== String(userId)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: jsonHeaders,
      })
    }

    const isActive = (storeRow as { is_active?: boolean }).is_active
    if (isActive === false) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: jsonHeaders,
      })
    }

    const updateBase: Record<string, unknown> = {}

    if (body.supplier_id !== undefined) {
      updateBase.supplier_id =
        body.supplier_id != null ? Number(body.supplier_id) : null
    }
    if (body.external_id !== undefined) updateBase.external_id = body.external_id
    if (body.name !== undefined) updateBase.name = body.name
    if (body.name_ua !== undefined) updateBase.name_ua = body.name_ua
    if (body.docket !== undefined) updateBase.docket = body.docket
    if (body.docket_ua !== undefined) updateBase.docket_ua = body.docket_ua
    if (body.description !== undefined)
      updateBase.description = body.description
    if (body.description_ua !== undefined)
      updateBase.description_ua = body.description_ua
    if (body.vendor !== undefined) updateBase.vendor = body.vendor
    if (body.article !== undefined) updateBase.article = body.article
    if (body.category_id !== undefined) {
      updateBase.category_id =
        body.category_id != null ? Number(body.category_id) : null
    }

    if (body.category_external_id !== undefined) {
      const raw = body.category_external_id
      let nextExt: string | null = null

      if (raw != null && String(raw).trim() !== "") {
        nextExt = String(raw)
      } else if (body.category_id != null) {
        const { data: catRow } = await supabase
          .from("store_categories")
          .select("external_id")
          .eq("id", Number(body.category_id))
          .maybeSingle()
        nextExt = (catRow as { external_id?: string } | null)?.external_id ?? null
      } else {
        nextExt =
          (productRow as { category_external_id?: string } | null)
            ?.category_external_id ?? null
      }

      if (nextExt != null && String(nextExt).trim() !== "") {
        updateBase.category_external_id = String(nextExt)
      } else {
        updateBase.category_external_id = null
      }
    }

    if (body.currency_code !== undefined)
      updateBase.currency_code = body.currency_code
    if (body.price !== undefined) updateBase.price = body.price
    if (body.price_old !== undefined) updateBase.price_old = body.price_old
    if (body.price_promo !== undefined)
      updateBase.price_promo = body.price_promo
    if (body.stock_quantity !== undefined)
      updateBase.stock_quantity = body.stock_quantity
    if (body.available !== undefined) updateBase.available = body.available
    if (body.state !== undefined) updateBase.state = body.state

    if (Object.keys(updateBase).length > 0) {
      const { error: updErr } = await supabase
        .from("store_products")
        .update(updateBase)
        .eq("id", productId)

      if (updErr) {
        return new Response(
          JSON.stringify({
            error: "update_failed",
            message: updErr.message || "Update failed",
          }),
          { status: 500, headers: jsonHeaders },
        )
      }
    }

    try {
      await Promise.all([
        handleImages(productId, body.images),
        handleParams(productId, body.params),
      ])
    } catch (subErr) {
      return new Response(
        JSON.stringify({
          error: "update_failed",
          message:
            (subErr as { message?: string })?.message ||
            "Update sub-ops failed",
        }),
        { status: 500, headers: jsonHeaders },
      )
    }

    return new Response(
      JSON.stringify({ product_id: String(productId) }),
      { status: 200, headers: jsonHeaders },
    )
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? "Update failed"
    return new Response(
      JSON.stringify({ error: "update_failed", message: msg }),
      { status: 500, headers: jsonHeaders },
    )
  }
})
