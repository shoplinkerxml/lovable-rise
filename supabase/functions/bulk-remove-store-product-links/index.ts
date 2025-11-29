import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Body = { product_ids?: string[]; store_ids?: string[] }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: {
          headers: authHeader ? { Authorization: `Bearer ${token}` } : {},
        },
      },
    )

    const body: Body = await req.json().catch(() => ({} as Body))

    const productIds = Array.isArray(body.product_ids)
      ? body.product_ids.filter((v) => !!v).map(String)
      : []
    const storeIds = Array.isArray(body.store_ids)
      ? body.store_ids.filter((v) => !!v).map(String)
      : []

    if (storeIds.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, deletedByStore: {} }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    // Вариант 1: product_ids не переданы → удалить все связи по этим магазинам
    if (productIds.length === 0) {
      const { data: toDeleteRows, error: selErr } = await (supabase as any)
        .from('store_product_links')
        .select('store_id,product_id,is_active')
        .in('store_id', storeIds)

      if (selErr) {
        return new Response(JSON.stringify({ error: 'preselect_failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }

      const deletedByStore: Record<string, number> = {}
      for (const r of toDeleteRows || []) {
        const sid = String((r as any)?.store_id)
        const isActive = (r as any)?.is_active !== false
        if (!sid) continue
        if (isActive) {
          deletedByStore[sid] = (deletedByStore[sid] || 0) + 1
        }
      }

      const { error: delErr } = await (supabase as any)
        .from('store_product_links')
        .delete()
        .in('store_id', storeIds)

      if (delErr) {
        return new Response(JSON.stringify({ error: 'delete_failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }

      return new Response(
        JSON.stringify({
          deleted: (toDeleteRows || []).length,
          deletedByStore,
        }),
        { status: 200, headers: corsHeaders },
      )
    }

    // Вариант 2: есть и product_ids, и store_ids → удалить только пересечение
    const { data: toDeleteRows, error: selErr2 } = await (supabase as any)
      .from('store_product_links')
      .select('store_id,product_id,is_active')
      .in('product_id', productIds)
      .in('store_id', storeIds)

    if (selErr2) {
      return new Response(JSON.stringify({ error: 'preselect_failed' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const deletedByStore: Record<string, number> = {}
    for (const r of toDeleteRows || []) {
      const sid = String((r as any)?.store_id)
      const isActive = (r as any)?.is_active !== false
      if (!sid) continue
      if (isActive) {
        deletedByStore[sid] = (deletedByStore[sid] || 0) + 1
      }
    }

    const { error: delErr2 } = await (supabase as any)
      .from('store_product_links')
      .delete()
      .in('product_id', productIds)
      .in('store_id', storeIds)

    if (delErr2) {
      return new Response(JSON.stringify({ error: 'delete_failed' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return new Response(
      JSON.stringify({
        deleted: (toDeleteRows || []).length,
        deletedByStore,
      }),
      { status: 200, headers: corsHeaders },
    )
  } catch (e) {
    const msg = (e as any)?.message || 'bulk_delete_failed'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
