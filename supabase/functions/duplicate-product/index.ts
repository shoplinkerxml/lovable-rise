import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, CopyObjectCommand } from "npm:@aws-sdk/client-s3"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
}

type Body = {
  productId: string
}

function base64UrlToBase64(input: string): string {
  return input.replace(/-/g, "+").replace(/_/g, "/")
}

function decodeJwtSub(authHeader?: string | null): string | null {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    const payload = atob(base64UrlToBase64(parts[1]))
    const json = JSON.parse(payload)
    return json?.sub ?? null
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

    const uploadsIdx = pathname.indexOf("uploads/")
    if (uploadsIdx > 0) return pathname.slice(uploadsIdx)

    return parts.join("/") || null
  } catch {
    return null
  }
}

// Инициализация окружения и клиентов один раз (быстрее на каждом запросе)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? ""
const bucket = Deno.env.get("R2_BUCKET_NAME") ?? ""
const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? ""
const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? ""

if (!SUPABASE_URL || !SERVICE_KEY || !accountId || !bucket || !accessKeyId || !secretAccessKey) {
  throw new Error("Missing environment configuration")
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
})

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
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

    const body = (await req.json()) as Body
    const originalId = String(body?.productId || "")
    if (!originalId) {
      return new Response(JSON.stringify({ error: "invalid_body" }), {
        status: 400,
        headers: jsonHeaders,
      })
    }

    const { data: original, error: origErr } = await supabase
      .from("store_products")
      .select("*")
      .eq("id", originalId)
      .maybeSingle()

    if (origErr || !original) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: jsonHeaders,
      })
    }

    // Параллельно тянем: магазин товара, подписку, все магазины пользователя, параметры и картинки
    const [
      storeRowRes,
      subsRes,
      userStoresRes,
      paramsRes,
      imagesRes,
    ] = await Promise.all([
      supabase
        .from("user_stores")
        .select("id,user_id")
        .eq("id", String(original.store_id))
        .maybeSingle(),
      supabase
        .from("user_subscriptions")
        .select("id,tariff_id,end_date,is_active,start_date")
        .eq("user_id", String(userId))
        .eq("is_active", true)
        .order("start_date", { ascending: false })
        .limit(1),
      supabase
        .from("user_stores")
        .select("id")
        .eq("user_id", String(userId))
        .eq("is_active", true),
      supabase
        .from("store_product_params")
        .select("name,value,order_index,paramid,valueid")
        .eq("product_id", originalId)
        .order("order_index", { ascending: true }),
      supabase
        .from("store_product_images")
        .select("url,order_index,is_main")
        .eq("product_id", originalId)
        .order("order_index", { ascending: true }),
    ])

    const storeRow = (storeRowRes as any)?.data as { id: string; user_id: string } | null
    if (!storeRow || String(storeRow.user_id) !== String(userId)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: jsonHeaders,
      })
    }

    const subsRows = ((subsRes as any)?.data || []) as any[]
    let activeSub: any = subsRows[0] || null

    if (activeSub && activeSub.end_date) {
      const endMs = new Date(activeSub.end_date).getTime()
      if (endMs < Date.now()) {
        await supabase
          .from("user_subscriptions")
          .update({ is_active: false })
          .eq("id", activeSub.id)
        activeSub = null
      }
    }

    if (!activeSub) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: "Ліміт товарів вичерпано",
        }),
        { status: 400, headers: jsonHeaders },
      )
    }

    const tariffId = Number(activeSub.tariff_id)
    const { data: limitRow } = await supabase
      .from("tariff_limits")
      .select("value")
      .eq("tariff_id", tariffId)
      .ilike("limit_name", "%товар%")
      .eq("is_active", true)
      .maybeSingle()

    const maxProducts = Number(limitRow?.value ?? 0)
    if (!Number.isFinite(maxProducts) || maxProducts <= 0) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: "Ліміт товарів вичерпано",
        }),
        { status: 400, headers: jsonHeaders },
      )
    }

    const userStores = ((userStoresRes as any)?.data || []) as { id: string }[]
    const storeIds = userStores.map((s) => String(s.id))

    let currentCount = 0
    if (storeIds.length > 0) {
      const { count } = await supabase
        .from("store_products")
        .select("id", { count: "exact", head: true })
        .in("store_id", storeIds)
      currentCount = Number(count || 0)
    }

    if (currentCount >= maxProducts) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: "Ліміт товарів вичерпано",
        }),
        { status: 400, headers: jsonHeaders },
      )
    }

    const paramsRows = ((paramsRes as any)?.data || []) as any[]
    const imageRows = ((imagesRes as any)?.data || []) as any[]

    const insertBase = {
      store_id: original.store_id,
      supplier_id: original.supplier_id ?? null,
      external_id: original.external_id,
      name: original.name,
      name_ua: original.name_ua ?? null,
      docket: original.docket ?? null,
      docket_ua: original.docket_ua ?? null,
      description: original.description ?? null,
      description_ua: original.description_ua ?? null,
      vendor: original.vendor ?? null,
      article: original.article ?? null,
      category_id: original.category_id ?? null,
      category_external_id: original.category_external_id ?? null,
      currency_code: original.currency_code ?? null,
      price: original.price ?? null,
      price_old: original.price_old ?? null,
      price_promo: original.price_promo ?? null,
      stock_quantity: original.stock_quantity ?? 0,
      available: original.available ?? true,
      state: original.state ?? "new",
    } as Record<string, unknown>

    const createOnce = async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase
        .from("store_products")
        .insert([payload])
        .select("*")
        .single()
      return { data, error } as const
    }

    let { data: created, error: createErr } = await createOnce(insertBase)

    if (createErr) {
      const fallback = {
        ...insertBase,
        external_id: `${original.external_id}-copy-${Math.floor(Math.random() * 1000)}`,
      }
      const res = await createOnce(fallback)
      created = res.data
      createErr = res.error
    }

    if (!created || createErr) {
      return new Response(JSON.stringify({ error: "create_failed" }), {
        status: 500,
        headers: jsonHeaders,
      })
    }

    const now = new Date()
    const yyyy = now.getUTCFullYear()
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
    const dd = String(now.getUTCDate()).padStart(2, "0")
    const datePath = `${yyyy}/${mm}/${dd}`

    const uploaded: Array<{ url: string; order_index: number; is_main: boolean }> = []

    if (imageRows.length) {
      const copyResults = await Promise.all(
        imageRows.map(async (img, idx) => {
          let src = typeof img?.url === "string" ? img.url : ""
          if (!src) return null

          try {
            const u = new URL(src)
            const host = u.host
            const isOurBucket =
              host === `${bucket}.${accountId}.r2.cloudflarestorage.com` ||
              host ===
                "shop-linker.9ea53eb0cc570bc4b00e01008dee35e6.r2.cloudflarestorage.com"

            if (isOurBucket) {
              const sourceKey = extractObjectKeyFromUrl(src)
              if (sourceKey) {
                const parts = sourceKey.split("/").filter(Boolean)
                const baseName = parts[parts.length - 1] || "file"
                const cleanName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_")
                const suffix =
                  crypto.randomUUID?.() ??
                  `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

                const destKey = `uploads/products/${String(
                  created.external_id || created.id,
                )}/${datePath}/${suffix}-${cleanName}`

                await s3.send(
                  new CopyObjectCommand({
                    Bucket: bucket,
                    Key: destKey,
                    CopySource: `${bucket}/${sourceKey}`,
                  }),
                )

                src = `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${destKey}`
              }
            }
          } catch {
            // игнорируем, остаётся исходный src
          }

          if (!src.trim()) return null

          return {
            url: src,
            order_index:
              typeof img?.order_index === "number" ? img.order_index : idx,
            is_main: !!img?.is_main || idx === 0,
          }
        }),
      )

      for (const item of copyResults) {
        if (item) uploaded.push(item)
      }
    }

    if (uploaded.length) {
      const hasMain = uploaded.some((i) => i.is_main === true)
      let assigned = false

      const normalized = uploaded.map((i, index) => {
        let m = i.is_main === true && !assigned

        if (hasMain) {
          if (i.is_main === true && !assigned) {
            assigned = true
          } else {
            m = false
          }
        } else {
          m = index === 0
        }

        return {
          product_id: created.id,
          url: i.url,
          order_index:
            typeof i.order_index === "number" ? i.order_index : index,
          is_main: m,
        } as Record<string, unknown>
      })

      const mainIdx = normalized.findIndex((i) => i.is_main === true)

      const ordered = (() => {
        const arr = normalized.slice()
        if (mainIdx > 0) {
          const [main] = arr.splice(mainIdx, 1)
          arr.unshift(main)
        }
        return arr.map((i, idx) => ({ ...i, order_index: idx }))
      })()

      await supabase.from("store_product_images").insert(ordered)
    }

    if (paramsRows.length) {
      const paramsData = paramsRows.map((p: any, index: number) => ({
        product_id: created.id,
        name: p.name,
        value: p.value,
        order_index:
          typeof p.order_index === "number" ? p.order_index : index,
        paramid: p.paramid ?? null,
        valueid: p.valueid ?? null,
      }))

      await supabase.from("store_product_params").insert(paramsData)
    }

    return new Response(
      JSON.stringify({ success: true, product: created }),
      { status: 200, headers: jsonHeaders },
    )
  } catch (e) {
    const msg = (e as any)?.message ?? "Duplicate failed"
    return new Response(
      JSON.stringify({ error: "duplicate_failed", message: msg }),
      { status: 500, headers: jsonHeaders },
    )
  }
})
