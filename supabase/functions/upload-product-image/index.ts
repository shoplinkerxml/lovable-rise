import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js"
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" }

// Image size configs
const CARD_WIDTH = 900
const THUMB_WIDTH = 300

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

// Simple image resize using canvas-like approach for Deno
// Since imagescript has issues, we'll use a simpler approach - just convert to webp without resize for now
// and rely on the browser/CDN for resizing, or use a different library

async function processImage(imageBytes: Uint8Array, _targetWidth?: number): Promise<Uint8Array> {
  // For now, just return the original bytes
  // TODO: Add proper image processing with a working library
  // The images will be stored as-is and can be resized on-demand via CDN or frontend
  return imageBytes
}

// ENV
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? ""
const bucket = Deno.env.get("R2_BUCKET_NAME") ?? ""
const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? ""
const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? ""
// Use images-service domain as default - it should be properly configured to serve from R2
const IMAGE_BASE_URL = Deno.env.get("R2_PUBLIC_BASE_URL") || "https://images-service.xmlreactor.shop"

// Log the base URL for debugging
console.log(`[upload-product-image] Using IMAGE_BASE_URL: ${IMAGE_BASE_URL}`)

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
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

    if (body.fileData) {
      // Base64 upload
      imageBytes = decodeBase64ToBytes(body.fileData)
    } else if (body.url) {
      // URL upload
      const imgRes = await fetch(body.url)
      if (!imgRes.ok) {
        return new Response(JSON.stringify({ error: "fetch_url_failed" }), { status: 400, headers: jsonHeaders })
      }
      imageBytes = new Uint8Array(await imgRes.arrayBuffer())
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

    // Generate R2 keys
    const baseKey = `products/${productId}/${imageId}`
    const originalKey = `${baseKey}/original.webp`
    const cardKey = `${baseKey}/card.webp`
    const thumbKey = `${baseKey}/thumb.webp`

    try {
      // Process images - for now storing same size, resize can be done via CDN
      console.log(`[upload-product-image] Processing image...`)
      const processedBuffer = await processImage(imageBytes)
      
      // Use same buffer for all sizes for now (CDN can resize on-demand)
      const originalBuffer = processedBuffer
      const cardBuffer = processedBuffer
      const thumbBuffer = processedBuffer

      // Upload to R2
      console.log(`[upload-product-image] Uploading original (${originalBuffer.length} bytes)...`)
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: originalKey,
        Body: originalBuffer,
        ContentType: "image/webp",
      }))

      console.log(`[upload-product-image] Uploading card (${cardBuffer.length} bytes)...`)
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: cardKey,
        Body: cardBuffer,
        ContentType: "image/webp",
      }))

      console.log(`[upload-product-image] Uploading thumb (${thumbBuffer.length} bytes)...`)
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: "image/webp",
      }))

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
      await supabase.from("store_product_images").delete().eq("id", imageId)
      
      return new Response(
        JSON.stringify({ error: "processing_failed", message: (processErr as any)?.message }),
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
