import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: authHeader ? { Authorization: `Bearer ${token}` } : {} } }
    )

    const { data: stores, error } = await (supabase as any)
      .from('user_stores')
      .select('id,user_id,store_name,store_company,store_url,template_id,xml_config,custom_mapping,is_active,created_at,updated_at')
      .eq('is_active', true)
      .order('store_name', { ascending: true })

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

            const { data: linkRows } = await (supabase as any)
              .from('store_product_links')
              .select('store_id,is_active,custom_category_id,store_products(category_id,category_external_id)')
              .in('store_id', storeIds)

            const productsCountMap: Record<string, number> = {}
            const categoriesMap: Record<string, Set<string>> = {}
            for (const r of linkRows || []) {
              const sid = String((r as any).store_id)
              const active = (r as any).is_active !== false
              if (active) productsCountMap[sid] = (productsCountMap[sid] || 0) + 1
              const linkCat = (r as any).custom_category_id != null ? String((r as any).custom_category_id) : null
              const baseCatId = (r as any)?.store_products?.category_id != null ? String((r as any).store_products.category_id) : (r as any)?.store_products?.category_external_id ? String((r as any).store_products.category_external_id) : null
              const catId = linkCat || baseCatId
              if (catId) {
                if (!categoriesMap[sid]) categoriesMap[sid] = new Set()
                categoriesMap[sid].add(catId)
              }
            }

    const aggregated: ShopAggregated[] = shops.map(s => ({
      ...s,
      marketplace: s.template_id ? templatesMap[String(s.template_id)] || 'Не вказано' : 'Не вказано',
      productsCount: productsCountMap[s.id] || 0,
      categoriesCount: (categoriesMap[s.id]?.size) || 0,
    }))

    return new Response(JSON.stringify({ shops: aggregated }), { status: 200, headers: corsHeaders })
  } catch (e) {
    const msg = (e as any)?.message || 'aggregation_failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})