import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Body = { store_id?: string | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const body = (await req.json().catch(() => ({}))) as Body
    const storeId = String(body?.store_id || '').trim()
    if (!storeId) {
      return new Response(JSON.stringify({ error: 'store_id_required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const url = Deno.env.get('SUPABASE_URL') || ''
    const key = Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'misconfigured_supabase' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(url, key, {
      global: authHeader ? { headers: { Authorization: `Bearer ${token}` } } : {},
    })

    // 1. Ссылки и маппинг категорий по магазину — параллельно
    const [{ data: links, error: linksErr }, { data: maps, error: mapsErr }] =
      await Promise.all([
        (supabase as any)
          .from('store_product_links')
          .select(
            'is_active,custom_category_id,store_id,store_products(category_id,category_external_id)',
          )
          .eq('store_id', storeId),
        (supabase as any)
          .from('store_store_categories')
          .select('store_id,category_id,external_id,is_active')
          .eq('store_id', storeId),
      ])

    if (linksErr) {
      return new Response(JSON.stringify({ error: 'links_fetch_failed' }), {
        status: 500,
        headers: corsHeaders,
      })
    }
    if (mapsErr) {
      return new Response(JSON.stringify({ error: 'maps_fetch_failed' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const byCatId: Record<string, string | null> = {}
    for (const m of maps || []) {
      const active = (m as any)?.is_active !== false
      if (!active) continue
      const cid =
        (m as any)?.category_id != null ? String((m as any).category_id) : null
      const ext =
        (m as any)?.external_id != null ? String((m as any).external_id) : null
      if (cid) byCatId[cid] = ext || null
    }

    const ids = new Set<string>()
    const exts = new Set<string>()

    for (const r of links || []) {
      const active = (r as any)?.is_active !== false
      if (!active) continue

      const linkExt =
        (r as any)?.custom_category_id != null
          ? String((r as any).custom_category_id)
          : null
      const baseCid =
        (r as any)?.store_products?.category_id != null
          ? String((r as any).store_products.category_id)
          : null
      const baseExt =
        (r as any)?.store_products?.category_external_id != null
          ? String((r as any).store_products.category_external_id)
          : null

      if (linkExt) {
        exts.add(linkExt)
      } else if (baseCid && byCatId[baseCid]) {
        exts.add(String(byCatId[baseCid]))
      } else if (baseExt) {
        exts.add(baseExt)
      } else if (baseCid) {
        ids.add(baseCid)
      }
    }

    const idList = Array.from(ids)
    const extList = Array.from(exts)
    const namesSet = new Set<string>()

    // Нет категорий для загрузки — сразу ответ
    if (idList.length === 0 && extList.length === 0) {
      return new Response(JSON.stringify({ names: [] }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    // 2. Все запросы к store_categories — одним проходом (параллельно по id и external_id)
    const [catByIdRes, catByExtRes] = await Promise.all([
      idList.length
        ? (supabase as any)
            .from('store_categories')
            .select('id,name')
            .in('id', idList)
        : Promise.resolve({ data: [] }),
      extList.length
        ? (supabase as any)
            .from('store_categories')
            .select('external_id,name')
            .in('external_id', extList)
        : Promise.resolve({ data: [] }),
    ])

    const catRows = (catByIdRes as any)?.data || []
    const extCatRows = (catByExtRes as any)?.data || []

    for (const r of catRows) {
      const name = (r as any)?.name
      if (name) namesSet.add(String(name))
    }
    for (const r of extCatRows) {
      const name = (r as any)?.name
      if (name) namesSet.add(String(name))
    }

    const names = Array.from(namesSet).sort((a, b) => a.localeCompare(b))

    return new Response(JSON.stringify({ names }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (e) {
    const msg = (e as any)?.message || 'aggregation_failed'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
