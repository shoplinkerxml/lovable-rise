import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Body = { product_id?: string; url?: string; order_index?: number; is_main?: boolean }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const tokenHdr = req.headers.get('X-Worker-Token') || ''
    const expected = Deno.env.get('WORKER_SHARED_SECRET') || ''
    if (!expected || tokenHdr !== expected) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const body: Body = await req.json().catch(() => ({}) as Body)
    const productId = body?.product_id ? String(body.product_id) : ''
    const url = body?.url ? String(body.url) : ''
    const orderIdx = typeof body?.order_index === 'number' ? body.order_index : 0
    const isMain = body?.is_main === true
    if (!productId) return new Response(JSON.stringify({ error: 'invalid_product_id' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { global: { headers: {} } }
    )

    const { data, error } = await supabase
      .from('store_product_images')
      .insert([{ product_id: productId, url: url || '#pending', order_index: orderIdx, is_main: isMain }])
      .select('id')
      .single()
    if (error) return new Response(JSON.stringify({ error: 'insert_failed' }), { status: 500, headers: corsHeaders })
    const imageId = Number((data as any)?.id)
    return new Response(JSON.stringify({ image_id: imageId }), { status: 200, headers: corsHeaders })
  } catch (e) {
    const msg = (e as any)?.message || 'failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})

