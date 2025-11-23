import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

type Body = { product_ids?: string[]; store_ids?: string[] }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: authHeader ? { Authorization: `Bearer ${token}` } : {} } }
    )

    const body: Body = await req.json().catch(() => ({} as Body))
    const productIds = Array.isArray(body.product_ids) ? body.product_ids.filter((v) => !!v).map(String) : []
    const storeIds = Array.isArray(body.store_ids) ? body.store_ids.filter((v) => !!v).map(String) : []

    if (storeIds.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), { status: 200, headers: corsHeaders })
    }

    // If no productIds provided, delete ALL links for the given stores
    if (productIds.length === 0) {
      const { data: toDeleteRows, error: selErr } = await supabase
        .from('store_product_links')
        .select('store_id,product_id,is_active')
        .in('store_id', storeIds)
      if (selErr) return new Response(JSON.stringify({ error: 'preselect_failed' }), { status: 500, headers: corsHeaders })

      const deletedByStore: Record<string, number> = {}
      for (const r of toDeleteRows || []) {
        const sid = String((r as any)?.store_id)
        const isActive = (r as any)?.is_active !== false
        // decrement only active links for UI counts
        deletedByStore[sid] = (deletedByStore[sid] || 0) + (isActive ? 1 : 0)
      }

      const { error: delErr } = await supabase
        .from('store_product_links')
        .delete()
        .in('store_id', storeIds)
      if (delErr) return new Response(JSON.stringify({ error: 'delete_failed' }), { status: 500, headers: corsHeaders })

      return new Response(JSON.stringify({ deleted: (toDeleteRows || []).length, deletedByStore }), { status: 200, headers: corsHeaders })
    }

    const { error } = await supabase
      .from('store_product_links')
      .delete()
      .in('product_id', productIds)
      .in('store_id', storeIds)

    if (error) return new Response(JSON.stringify({ error: 'delete_failed' }), { status: 500, headers: corsHeaders })

    // compute counts of active deleted links for UI
    const deletedByStore: Record<string, number> = {}
    try {
      const { data: rows } = await supabase
        .from('store_product_links')
        .select('store_id,product_id,is_active')
        .in('product_id', productIds)
        .in('store_id', storeIds)
      for (const r of rows || []) {
        const sid = String((r as any)?.store_id)
        const isActive = (r as any)?.is_active !== false
        deletedByStore[sid] = (deletedByStore[sid] || 0) + (isActive ? 1 : 0)
      }
    } catch {}
    return new Response(JSON.stringify({ deleted: productIds.length * storeIds.length, deletedByStore }), { status: 200, headers: corsHeaders })
  } catch (e) {
    const msg = (e as any)?.message || 'bulk_delete_failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})
