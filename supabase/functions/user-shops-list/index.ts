import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const jsonResponse = (body: unknown, init?: ResponseInit) => {
  const headers = new Headers(corsHeaders)
  if (init?.headers) {
    const extra = new Headers(init.headers)
    extra.forEach((value, key) => headers.set(key, value))
  }
  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token =
      authHeader.startsWith('Bearer ') ?
        authHeader.slice('Bearer '.length).trim() :
        ''

    const body: RequestBody = await req.json().catch(() => ({} as RequestBody))

    const storeId = body.store_id ? String(body.store_id) : null
    const includeConfig = body.includeConfig === true || !!storeId

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: authHeader && token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {},
      },
    )

    const baseSelect = includeConfig
      ? 'id,user_id,store_name,store_company,store_url,template_id,xml_config,custom_mapping,is_active,created_at,updated_at'
      : 'id,user_id,store_name,store_company,store_url,template_id,is_active,created_at,updated_at'

    let storesQuery = (supabase as any)
      .from('user_stores')
      .select(baseSelect as any)
      .eq('is_active', true)

    if (storeId) {
      storesQuery = storesQuery.eq('id', storeId)
    }

    const { data: stores, error: storesError } = await storesQuery.order(
      'store_name',
      { ascending: true },
    )

    if (storesError) {
      console.error('Stores fetch error:', storesError)
      return jsonResponse({ error: 'shops_fetch_failed' }, { status: 500 })
    }

    const shops: Shop[] = (stores ?? []) as Shop[]

    if (shops.length === 0) {
      return jsonResponse({ shops: [] }, { status: 200 })
    }

    const storeIds = shops.map((s) => s.id)
    const templateIds = Array.from(
      new Set(
        shops
          .map((s) => s.template_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    )

    const templatesPromise =
      templateIds.length > 0
        ? (supabase as any)
            .from('store_templates')
            .select('id,marketplace')
            .in('id', templateIds)
            .then((res: any) => ({ data: res?.data ?? [], error: res?.error ?? null }))
        : Promise.resolve({ data: [], error: null })
    const templatesMap: Record<string, string> = {}

    const linksQuery = (supabase as any)
      .from('store_product_links')
      .select('store_id,is_active')
    const catsQuery = (supabase as any)
      .from('store_store_categories')
      .select('store_id,is_active')
    const linksPromise =
      storeId
        ? linksQuery.eq('store_id', storeId).then((res: any) => ({ data: res?.data ?? [], error: res?.error ?? null }))
        : linksQuery.in('store_id', storeIds).then((res: any) => ({ data: res?.data ?? [], error: res?.error ?? null }))
    const catsPromise =
      storeId
        ? catsQuery.eq('store_id', storeId).then((res: any) => ({ data: res?.data ?? [], error: res?.error ?? null }))
        : catsQuery.in('store_id', storeIds).then((res: any) => ({ data: res?.data ?? [], error: res?.error ?? null }))
    const [{ data: templates }, { data: links }, { data: cats }] = await Promise.all([
      templatesPromise,
      linksPromise,
      catsPromise,
    ])
    for (const r of (templates || [])) {
      const id = (r as any).id
      const name = (r as any).marketplace
      if (id) templatesMap[String(id)] = name || 'Не вказано'
    }
    const productsCountByStore: Record<string, number> = {}
    for (const r of ((links as any[]) || [])) {
      const sid = (r as any)?.store_id != null ? String((r as any).store_id) : ''
      const active = (r as any)?.is_active !== false
      if (sid && active) productsCountByStore[sid] = (productsCountByStore[sid] || 0) + 1
    }
    const categoriesCountByStore: Record<string, number> = {}
    for (const r of ((cats as any[]) || [])) {
      const sid = (r as any)?.store_id != null ? String((r as any).store_id) : ''
      const active = (r as any)?.is_active !== false
      if (sid && active) categoriesCountByStore[sid] = (categoriesCountByStore[sid] || 0) + 1
    }

    const aggregated: ShopAggregated[] = shops.map((s) => ({
      ...s,
      marketplace: s.template_id
        ? templatesMap[String(s.template_id)] ?? 'Не вказано'
        : 'Не вказано',
      productsCount: productsCountByStore[String(s.id)] ?? 0,
      categoriesCount: categoriesCountByStore[String(s.id)] ?? 0,
    }))

    return jsonResponse({ shops: aggregated }, { status: 200 })
  } catch (e: any) {
    console.error('Unexpected error in shops aggregation:', e)
    const msg = e?.message || 'shops_aggregation_failed'
    return jsonResponse({ error: msg }, { status: 500 })
  }
})