import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Body = { store_id?: string | null; limit?: number | null; offset?: number | null }

type Product = {
  id: string
  store_id: string
  supplier_id?: number | null
  external_id?: string | null
  name?: string | null
  name_ua?: string | null
  docket?: string | null
  docket_ua?: string | null
  description?: string | null
  description_ua?: string | null
  vendor?: string | null
  article?: string | null
  category_id?: number | null
  category_external_id?: string | null
  currency_id?: string | null
  currency_code?: string | null
  price?: number | null
  price_old?: number | null
  price_promo?: number | null
  stock_quantity: number
  available: boolean
  state: string
  created_at: string
  updated_at: string
  is_active?: boolean
}

type ProductRow = Product & {
  mainImageUrl?: string
  categoryName?: string
  supplierName?: string
  linkedStoreIds?: string[]
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const body: Body = await req.json().catch(() => ({} as Body))
    const storeId = body?.store_id || null

    const rawLimit = typeof body?.limit === 'number' ? body.limit! : null
    const rawOffset = typeof body?.offset === 'number' ? body.offset! : null

    const offset = rawOffset != null && rawOffset >= 0 ? rawOffset : 0
    const limitBase = rawLimit && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT
    const limit = Math.min(limitBase, MAX_LIMIT)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: {
          headers: authHeader ? { Authorization: `Bearer ${token}` } : {},
        },
      },
    )

    let products: Product[] = []
    let totalCount = 0
    const customExtByPid: Record<string, string | null> = {}

    if (storeId) {
      const { data, error, count } = await supabase
        .from('store_product_links')
        .select('product_id,store_id,is_active,custom_name,custom_description,custom_price,custom_price_old,custom_price_promo,custom_stock_quantity,custom_available,custom_category_id,store_products!inner(*)', { count: 'exact' })
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false, foreignTable: 'store_products' })
        .range(offset, offset + limit - 1)

      if (error) {
        return new Response(JSON.stringify({ error: 'products_fetch_failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }

      totalCount = count ?? 0

      const linkRows = (data || []) as any[]
      products = linkRows.map((row) => {
        const base = (row as any)?.store_products || {}
        const pid = String((base as any).id)
        const ext = (row as any)?.custom_category_id != null ? String((row as any).custom_category_id) : null
        if (pid && ext) customExtByPid[pid] = ext
        return {
          id: pid,
          store_id: String((base as any).store_id),
          supplier_id: (base as any).supplier_id ?? null,
          external_id: (base as any).external_id ?? null,
          name: ((row as any)?.custom_name ?? (base as any).name) ?? null,
          name_ua: (base as any).name_ua ?? null,
          docket: (base as any).docket ?? null,
          docket_ua: (base as any).docket_ua ?? null,
          description: ((row as any)?.custom_description ?? (base as any).description) ?? null,
          description_ua: (base as any).description_ua ?? null,
          vendor: (base as any).vendor ?? null,
          article: (base as any).article ?? null,
          category_id: (base as any).category_id ?? null,
          category_external_id: ((row as any)?.custom_category_id != null ? String((row as any).custom_category_id) : ((base as any).category_external_id ?? null)) as string | null,
          currency_id: (base as any).currency_id ?? null,
          currency_code: (base as any).currency_code ?? null,
          price: ((row as any)?.custom_price ?? (base as any).price) ?? null,
          price_old: (((row as any)?.custom_price_old ?? (base as any).price_old) ?? null),
          price_promo: ((row as any)?.custom_price_promo ?? (base as any).price_promo) ?? null,
          stock_quantity: (((row as any)?.custom_stock_quantity ?? (base as any).stock_quantity) ?? 0) as number,
          available: (((row as any)?.custom_available ?? (base as any).available) ?? true) as boolean,
          state: (base as any).state ?? 'new',
          created_at: (base as any).created_at ?? new Date().toISOString(),
          updated_at: (base as any).updated_at ?? new Date().toISOString(),
          is_active: (row as any)?.is_active !== false,
        }
      })
    } else {
      const { data, error, count } = await supabase
        .from('store_products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return new Response(JSON.stringify({ error: 'products_fetch_failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }

      products = (data || []) as Product[]
      totalCount = count ?? 0
    }

    const ids = products.map((p) => String(p.id)).filter((v) => !!v)
    const categoryIds = products.map((p) => p.category_id).filter((v) => v != null) as number[]
    const externalCategoryIdsBase = products.map((p) => p.category_external_id).filter((v) => !!v) as string[]
    const externalSet = new Set<string>(externalCategoryIdsBase)
    for (const [pid, ext] of Object.entries(customExtByPid)) { if (ext) externalSet.add(ext) }
    const externalCategoryIds = Array.from(externalSet)
    const supplierIdsRaw = products.map((p) => p.supplier_id).filter((v) => v != null) as number[]
    const supplierIds = Array.from(new Set(supplierIdsRaw))

    const imgsMainPromise = ids.length > 0
      ? supabase.from('store_product_images').select('product_id,url,is_main,order_index').in('product_id', ids).eq('is_main', true)
      : Promise.resolve({ data: [], error: null } as any)
    const categoriesIdPromise = categoryIds.length > 0
      ? supabase.from('store_categories').select('id,name').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null } as any)
    const categoriesExtPromise = externalCategoryIds.length > 0
      ? supabase.from('store_categories').select('external_id,name').in('external_id', externalCategoryIds)
      : Promise.resolve({ data: [], error: null } as any)
    const suppliersPromise = supplierIds.length > 0
      ? supabase.from('user_suppliers').select('id,supplier_name').in('id', supplierIds as any)
      : Promise.resolve({ data: [], error: null } as any)
    const paramsPromise = ids.length > 0
      ? supabase.from('store_product_params').select('product_id,name,value').in('product_id', ids).in('name', ['docket', 'docket_ua'])
      : Promise.resolve({ data: [], error: null } as any)
    const linksPromise = (!storeId && ids.length > 0)
      ? supabase.from('store_product_links').select('product_id,store_id,is_active,custom_category_id').in('product_id', ids)
      : Promise.resolve({ data: [], error: null } as any)

    const [imgsMainRes, catsIdRes, catsExtRes, supsRes, paramsRes, linksRes] = await Promise.all([imgsMainPromise, categoriesIdPromise, categoriesExtPromise, suppliersPromise, paramsPromise, linksPromise])

    const mainImageMap: Record<string, string> = {}
    const imgMainRows = (imgsMainRes as any)?.data || []
    for (const r of imgMainRows) {
      const pid = String((r as any).product_id)
      const url = (r as any)?.url ? String((r as any).url) : ''
      if (pid && url) mainImageMap[pid] = url
    }
    const missingMain = ids.filter((pid) => !mainImageMap[pid])
    if (missingMain.length > 0) {
      const { data: imgRows2 } = await supabase.from('store_product_images').select('product_id,url,order_index').in('product_id', missingMain)
      const grouped: Record<string, any[]> = {}
      for (const r of imgRows2 || []) {
        const pid = String((r as any).product_id)
        if (!grouped[pid]) grouped[pid] = []
        grouped[pid].push(r)
      }
      for (const [pid, rows] of Object.entries(grouped)) {
        const sorted = (rows as any[]).sort((a, b) => (((a as any).order_index ?? 999) - ((b as any).order_index ?? 999)))
        const first = sorted[0]
        const url = (first as any)?.url ? String((first as any).url) : ''
        if (url) mainImageMap[pid] = url
      }
    }

    const categoryNameMap: Record<string, string> = {}
    for (const r of (((catsIdRes as any)?.data) || [])) {
      const id = (r as any).id
      const name = (r as any).name
      if (id != null && name) categoryNameMap[String(id)] = String(name)
    }
    for (const r of (((catsExtRes as any)?.data) || [])) {
      const eid = (r as any).external_id
      const name = (r as any).name
      if (eid && name) categoryNameMap[String(eid)] = String(name)
    }

    const supplierNameMap: Record<string | number, string> = {}
    for (const r of (((supsRes as any)?.data) || [])) {
      const id = (r as any).id
      const name = (r as any).supplier_name
      if (id != null && name) supplierNameMap[id] = String(name)
    }

    const storeLinksByProduct: Record<string, string[]> = {}
    const extByPid: Record<string, string | null> = {}
    for (const [pid, ext] of Object.entries(customExtByPid)) { if (ext) extByPid[pid] = ext }
    if (!storeId) {
      const linkRows = (((linksRes as any)?.data) || []) as any[]
      const extListByPid: Record<string, string[]> = {}
      for (const r of linkRows || []) {
        const pid = String((r as any).product_id)
        const sid = (r as any)?.store_id != null ? String((r as any).store_id) : ''
        const active = (r as any)?.is_active !== false
        const ext = (r as any)?.custom_category_id != null ? String((r as any).custom_category_id) : ''
        if (active) {
          if (!storeLinksByProduct[pid]) storeLinksByProduct[pid] = []
          if (sid) storeLinksByProduct[pid].push(sid)
          if (ext) {
            if (!extListByPid[pid]) extListByPid[pid] = []
            extListByPid[pid].push(ext)
          }
        }
      }
      for (const [pid, arr] of Object.entries(extListByPid)) {
        const uniq = Array.from(new Set(arr))
        extByPid[pid] = uniq.length === 1 ? uniq[0] : null
      }
    }

    const paramsMap: Record<string, Record<string, string>> = {}
    for (const pr of (((paramsRes as any)?.data) || [])) {
      const pid = String((pr as any).product_id)
      if (!paramsMap[pid]) paramsMap[pid] = {}
      paramsMap[pid][String((pr as any).name)] = String((pr as any).value)
    }

    const aggregated: ProductRow[] = products.map((p) => {
      const pid = String(p.id)
      const docket = p.docket ?? paramsMap[pid]?.['docket'] ?? null
      const docketUa = p.docket_ua ?? paramsMap[pid]?.['docket_ua'] ?? null
      const overrideExt = (extByPid[pid] || customExtByPid[pid] || null)

      return {
        ...p,
        docket,
        docket_ua: docketUa,
        mainImageUrl: mainImageMap[pid],
        categoryName:
          (overrideExt ? categoryNameMap[String(overrideExt)] : undefined) ||
          (p.category_id != null ? categoryNameMap[String(p.category_id)] : undefined) ||
          (p.category_external_id ? categoryNameMap[String(p.category_external_id)] : undefined),
        supplierName:
          p.supplier_id != null ? supplierNameMap[p.supplier_id] : undefined,
        linkedStoreIds: storeLinksByProduct[pid] || [],
      }
    })

    const hasMore = offset + limit < totalCount
    const nextOffset = hasMore ? offset + limit : null

    return new Response(
      JSON.stringify({
        products: aggregated,
        page: {
          limit,
          offset,
          hasMore,
          nextOffset,
          total: totalCount,
        },
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    )
  } catch (e) {
    const msg = (e as any)?.message || 'aggregation_failed'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
