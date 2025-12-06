// Use native Deno.serve for Supabase Edge Functions
import { createClient } from "npm:@supabase/supabase-js"
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3"
import { ImageMagick, initializeImageMagick, MagickFormat } from "npm:@imagemagick/magick-wasm@0.0.30"

function buildCorsHeadersFromRequest(req: Request): Record<string, string> {
  const origin = req.headers.get("origin")
  const allowOrigin = origin && origin !== "null" ? origin : "*"
  const requested = req.headers.get("access-control-request-headers") || "authorization, x-client-info, apikey, content-type, accept"
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": requested,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers": "Content-Type, Content-Length, ETag",
    "Vary": "Origin, Access-Control-Request-Headers, Access-Control-Request-Method",
  }
  if (allowOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true"
  }
  return headers
}

let magickInitialized = false
let magickInitPromise: Promise<void> | null = null
async function initMagickWasm(): Promise<void> {
  if (magickInitialized) return
  if (!magickInitPromise) {
    const magickWasmBytes = await Deno.readFile(
      new URL(
        "magick.wasm",
        import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30"),
      ),
    )
    magickInitPromise = initializeImageMagick(magickWasmBytes).then(() => {
      magickInitialized = true
    })
  }
  return magickInitPromise
}

// Image size configs
const CARD_WIDTH = 600
const THUMB_WIDTH = 200
const WEBP_QUALITY = 80

type Body = {
  productId?: string
  product_id?: string
  fileData?: string // base64
  fileName?: string
  fileType?: string
  url?: string // альтернатива - загрузка по URL
}

const base64UrlToBase64 = (input: string) => input.replace(/-/g, "+").replace(/_/g, "/")

const decodeJwtSub = (authHeader: string | null) => {
  try {
    const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim()
    const parts = token.split(".")
    if (parts.length < 2) return null
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(base64UrlToBase64(parts[1])), (c) => c.charCodeAt(0)),
      ),
    )
    return String(payload?.sub || payload?.user_id || "")
  } catch {
    return null
  }
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  // Handle data URL format
  const commaIdx = b64.indexOf(",")
  const pureBase64 = commaIdx >= 0 ? b64.slice(commaIdx + 1) : b64
  const binary = atob(pureBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const WEBP_QUALITY_ORIGINAL = 80
const WEBP_QUALITY_CARD = 80
const WEBP_QUALITY_THUMB = 70

function makeWebpVariant(bytes: Uint8Array, targetWidth: number | null, quality: number): Uint8Array {
  const result = ImageMagick.read(bytes, (img): Uint8Array => {
    if (targetWidth && targetWidth > 0) {
      const ratio = targetWidth / img.width
      const targetHeight = Math.max(1, Math.round(img.height * ratio))
      img.resize(targetWidth, targetHeight)
    }
    img.quality = quality
    img.format = MagickFormat.WebP
    return img.write((data) => data)
  })
  return result
}

async function toWebpVariants(bytes: Uint8Array, _mimeHint?: string): Promise<{ original: Uint8Array; card: Uint8Array; thumb: Uint8Array }> {
  const original = makeWebpVariant(bytes, null, WEBP_QUALITY_ORIGINAL)
  const card = makeWebpVariant(bytes, CARD_WIDTH, WEBP_QUALITY_CARD)
  const thumb = makeWebpVariant(bytes, THUMB_WIDTH, WEBP_QUALITY_THUMB)
  return { original, card, thumb }
}

function sniffMime(bytes: Uint8Array, hinted?: string): { mime: string; ext: string } {
  const hint = (hinted || '').toLowerCase()
  const map: Record<string, string> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  }
  if (map[hint]) return { mime: hint, ext: map[hint] }
  // Magic bytes detection
  if (bytes.length > 12) {
    const head = bytes.subarray(0, 12)
    const str = new TextDecoder().decode(head)
    // WEBP: RIFF....WEBP
    if (str.startsWith('RIFF') && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP') {
      return { mime: 'image/webp', ext: 'webp' }
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { mime: 'image/png', ext: 'png' }
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { mime: 'image/jpeg', ext: 'jpg' }
    }
    // GIF: GIF87a/GIF89a
    if (str.startsWith('GIF8')) {
      return { mime: 'image/gif', ext: 'gif' }
    }
  }
  return { mime: 'image/webp', ext: 'webp' }
}

// ENV
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? ""
const bucket = Deno.env.get("R2_BUCKET_NAME") ?? ""
const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? ""
const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? ""
// Resolve base URL for public image links
function resolvePublicBase(): string {
  const host = Deno.env.get("R2_PUBLIC_HOST") || ""
  if (host) {
    const h = host.startsWith("http") ? host : `https://${host}`
    try {
      const u = new URL(h)
      return `${u.protocol}//${u.host}`
    } catch {
      return h
    }
  }
  const raw = Deno.env.get("R2_PUBLIC_BASE_URL") || Deno.env.get("IMAGE_BASE_URL") || "https://images-service.xmlreactor.shop"
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
    const origin = `${u.protocol}//${u.host}`
    const path = (u.pathname || "/").replace(/^\/+/, "").replace(/\/+$/, "")
    return path ? `${origin}/${path}` : origin
  } catch {
    return raw
  }
}
const IMAGE_BASE_URL = resolvePublicBase()
console.log(`[upload-product-image] Using IMAGE_BASE_URL: ${IMAGE_BASE_URL}`)

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeadersFromRequest(req)
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" }
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    await initMagickWasm()
    // Auth check
    const auth = req.headers.get("authorization")
    if (!auth) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders })
    }

    const userId = decodeJwtSub(auth)
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders })
    }

    // Parse body
    const body = (await req.json().catch(() => ({}))) as Body
    const productId = (body.productId || body.product_id || "").trim()

    if (!productId || !uuidRegex.test(productId)) {
      return new Response(
        JSON.stringify({ error: "invalid_body", message: "product_id must be valid UUID" }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Check env config
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "server_misconfig", message: "Missing Supabase config" }), { status: 500, headers: jsonHeaders })
    }

    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: "server_misconfig", message: "Missing R2 config" }), { status: 500, headers: jsonHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })

    // Verify user owns this product
    const { data: product, error: prodErr } = await supabase
      .from("store_products")
      .select("id, store_id")
      .eq("id", productId)
      .single()

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "product_not_found" }), { status: 404, headers: jsonHeaders })
    }

    const { data: store } = await supabase
      .from("user_stores")
      .select("id, user_id")
      .eq("id", (product as any).store_id)
      .single()

    if (!store || (store as any).user_id !== userId) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: jsonHeaders })
    }

    // Get image data
    let imageBytes: Uint8Array
    let inputMime: string | undefined

    if (body.fileData) {
      // Base64 upload
      imageBytes = decodeBase64ToBytes(body.fileData)
      inputMime = body.fileType
    } else if (body.url) {
      // URL upload
      const imgRes = await fetch(body.url)
      if (!imgRes.ok) {
        return new Response(JSON.stringify({ error: "fetch_url_failed" }), { status: 400, headers: jsonHeaders })
      }
      imageBytes = new Uint8Array(await imgRes.arrayBuffer())
      inputMime = imgRes.headers.get('content-type') || undefined
    } else {
      return new Response(
        JSON.stringify({ error: "invalid_body", message: "fileData or url required" }),
        { status: 400, headers: jsonHeaders }
      )
    }

    console.log(`[upload-product-image] Processing image for product ${productId}, size: ${imageBytes.length} bytes`)

    // Determine next order_index
    let nextOrder = 0
    const { data: lastRow } = await supabase
      .from("store_product_images")
      .select("order_index")
      .eq("product_id", productId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastRow && typeof (lastRow as any).order_index === "number") {
      nextOrder = Number((lastRow as any).order_index) + 1
    }

    // Check if first image (make it main)
    const { count } = await supabase
      .from("store_product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)

    const isFirstImage = (count || 0) === 0

    // Create DB row first to get image_id
    const { data: inserted, error: insertErr } = await supabase
      .from("store_product_images")
      .insert({
        product_id: productId,
        url: "#processing",
        order_index: nextOrder,
        is_main: isFirstImage,
      })
      .select("id")
      .single()

    if (insertErr || !inserted) {
      console.error("[upload-product-image] Insert failed:", insertErr)
      return new Response(
        JSON.stringify({ error: "insert_failed", message: insertErr?.message }),
        { status: 500, headers: jsonHeaders }
      )
    }

    const imageId = (inserted as any).id
    console.log(`[upload-product-image] Created image row with id: ${imageId}`)

    // Detect mime
    const { mime } = sniffMime(imageBytes, inputMime)
    // Keys are always webp to keep consistent public URLs
    const baseKey = `products/${productId}/${imageId}`
    const originalKey = `${baseKey}/original.webp`
    const cardKey = `${baseKey}/card.webp`
    const thumbKey = `${baseKey}/thumb.webp`

    try {
      console.log(`[upload-product-image] Processing image with imagescript...`)
      const { original: originalBuffer, card: cardBuffer, thumb: thumbBuffer } = await toWebpVariants(imageBytes, inputMime)
      console.log(`[upload-product-image] Uploading original (${originalBuffer.length}), card (${cardBuffer.length}), thumb (${thumbBuffer.length})`)
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: originalKey, Body: originalBuffer, ContentType: 'image/webp' }))
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: cardKey, Body: cardBuffer, ContentType: 'image/webp' }))
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbKey, Body: thumbBuffer, ContentType: 'image/webp' }))

      console.log(`[upload-product-image] All uploads complete`)

      // Update DB with R2 keys
      const publicUrl = `${IMAGE_BASE_URL}/${cardKey}`
      const { error: updateErr } = await supabase
        .from("store_product_images")
        .update({
          url: publicUrl,
          r2_key_original: originalKey,
          r2_key_card: cardKey,
          r2_key_thumb: thumbKey,
        })
        .eq("id", imageId)

      if (updateErr) {
        console.error("[upload-product-image] Update failed:", updateErr)
      }

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          image_id: imageId,
          original_url: `${IMAGE_BASE_URL}/${originalKey}`,
          card_url: `${IMAGE_BASE_URL}/${cardKey}`,
          thumb_url: `${IMAGE_BASE_URL}/${thumbKey}`,
          r2_key_original: originalKey,
          r2_key_card: cardKey,
          r2_key_thumb: thumbKey,
          is_main: isFirstImage,
          order_index: nextOrder,
        }),
        { status: 200, headers: jsonHeaders }
      )
    } catch (processErr) {
      // Cleanup: delete the DB row if image processing failed
      console.error("[upload-product-image] Processing error:", processErr)
      // Do not delete row; instead, mark as failed for visibility but keep consistency
      await supabase.from("store_product_images").update({ url: "#failed" }).eq("id", imageId)
      
      return new Response(
        JSON.stringify({ error: "processing_failed", message: (processErr as any)?.message || 'Failed to upload image' }),
        { status: 500, headers: jsonHeaders }
      )
    }
  } catch (e) {
    console.error("[upload-product-image] Unexpected error:", e)
    return new Response(
      JSON.stringify({ error: "upload_failed", message: (e as any)?.message }),
      { status: 500, headers: jsonHeaders }
    )
  }
})
