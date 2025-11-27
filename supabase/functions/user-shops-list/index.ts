import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

type RequestBody = {
  includeConfig?: boolean | null
  store_id?: string | null
}

type Shop = {
  id: string
  user_id: string
  store_name: string
  store_company?: string | null
  store_url?: string | null
  template_id?: string | null
  xml_config?: unknown
  custom_mapping?: unknown
  is_active: boolean
  created_at: string
  updated_at: string
}

type ShopAggregated = Shop & {
  marketplace?: string
  productsCount?: number
  categoriesCount?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const body: RequestBody = await req.json().catch(() => ({}))
    const storeId = body?.store_id ? String(body.store_id) : null
    const includeConfig = (body?.includeConfig === true) || !!storeId
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: authHeader ? { Authorization: `Bearer ${token}` } : {} } }
    )

    const baseSelect = includeConfig
      ? 'id,user_id,store_name,store_company,store_url,template_id,xml_config,custom_mapping,is_active,created_at,updated_at'
      : 'id,user_id,store_name,store_company,store_url,template_id,is_active,created_at,updated_at'
    let storesQuery = (supabase as any)
      .from('user_stores')
      .select(baseSelect)
      .eq('is_active', true)
    if (storeId) storesQuery = storesQuery.eq('id', storeId)
    const { data: stores, error } = await storesQuery.order('store_name', { ascending: true })

    if (error) return new Response(JSON.stringify({ error: 'shops_fetch_failed' }), { status: 500, headers: corsHeaders })

    const shops = (stores || []) as Shop[]
    if (shops.length === 0) return new Response(JSON.stringify({ shops: [] }), { status: 200, headers: corsHeaders })

    const storeIds = shops.map(s => s.id)
    const templateIds = Array.from(new Set(shops.map(s => s.template_id).filter(Boolean))) as string[]

    const templatesMap: Record<string, string> = {}
    if (templateIds.length > 0) {
      const { data: templates } = await (supabase as any)
        .from('store_templates')
        .select('id,marketplace')
        .in('id', templateIds)
      for (const r of templates || []) {
        const id = (r as any).id
        const name = (r as any).marketplace
        if (id) templatesMap[String(id)] = name || 'Не вказано'
      }
    }

    const linksQuery = (supabase as any)
      .from('store_product_links')
      .select('store_id,is_active')
    const catsQuery = (supabase as any)
      .from('store_store_categories')
      .select('store_id,is_active')
    const linksPromise = storeId ? linksQuery.eq('store_id', storeId) : linksQuery.in('store_id', storeIds)
    const catsPromise = storeId ? catsQuery.eq('store_id', storeId) : catsQuery.in('store_id', storeIds)
    const [linksRes, catsRes] = await Promise.all([linksPromise, catsPromise])
    const productsCountByStore: Record<string, number> = {}
    for (const r of ((linksRes?.data as any[]) || [])) {
      const sid = (r as any)?.store_id != null ? String((r as any).store_id) : ''
      const active = (r as any)?.is_active !== false
      if (sid && active) productsCountByStore[sid] = (productsCountByStore[sid] || 0) + 1
    }
    const categoriesCountByStore: Record<string, number> = {}
    for (const r of ((catsRes?.data as any[]) || [])) {
      const sid = (r as any)?.store_id != null ? String((r as any).store_id) : ''
      const active = (r as any)?.is_active !== false
      if (sid && active) categoriesCountByStore[sid] = (categoriesCountByStore[sid] || 0) + 1
    }

    const aggregated: ShopAggregated[] = shops.map((s) => ({
      ...s,
      marketplace: s.template_id ? (templatesMap[String(s.template_id)] || 'Не вказано') : 'Не вказано',
      productsCount: productsCountByStore[String(s.id)] || 0,
      categoriesCount: categoriesCountByStore[String(s.id)] || 0,
    }))

    return new Response(JSON.stringify({ shops: aggregated }), { status: 200, headers: corsHeaders })
  } catch (e) {
    const msg = (e as any)?.message || 'shops_aggregation_failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})
