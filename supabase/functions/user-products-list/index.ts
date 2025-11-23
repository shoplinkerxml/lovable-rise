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
      const { count, error: countError } = await supabase
        .from('store_product_links')
        .select('product_id', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_active', true)

      if (countError) {
        return new Response(JSON.stringify({ error: 'count_failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }

      totalCount = count ?? 0

      const { data, error } = await supabase
        .from('store_product_links')
        .select('product_id,store_id,is_active,custom_name,custom_description,custom_price,custom_price_promo,custom_stock_quantity,custom_available,custom_category_id,store_products!inner(*)')
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
          price_old: (base as any).price_old ?? null,
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
      const { count, error: countError } = await supabase
        .from('store_products')
        .select('id', { count: 'exact', head: true })

      if (countError) {
        return new Response(JSON.stringify({ error: 'count_failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }

      totalCount = count ?? 0

      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return new Response(JSON.stringify({ error: 'products_fetch_failed' }), {
          status: 500,
          headers: corsHeaders,
        })
      }

      products = (data || []) as Product[]

      // If a product has exactly one active store link with custom_category_id,
      // prefer that category in global view to reflect store-specific mapping.
      const pidList = products.map(p => String(p.id)).filter(Boolean)
      if (pidList.length > 0) {
        const { data: glinks } = await supabase
          .from('store_product_links')
          .select('product_id,is_active,custom_category_id,store_id')
          .in('product_id', pidList)
        const linksByPid: Record<string, Array<any>> = {}
        for (const r of glinks || []) {
          const pid = String((r as any)?.product_id)
          const active = (r as any)?.is_active !== false
          if (!linksByPid[pid]) linksByPid[pid] = []
          if (active) linksByPid[pid].push(r)
        }
        for (const p of products) {
          const pid = String(p.id)
          const activeLinks = linksByPid[pid] || []
          if (activeLinks.length === 1) {
            const ext = (activeLinks[0] as any)?.custom_category_id != null ? String((activeLinks[0] as any).custom_category_id) : null
            if (ext) (p as any).category_external_id = ext
          }
        }
      }
    }

    const ids = products.map((p) => String(p.id)).filter((v) => !!v)
    const categoryIds = products
      .map((p) => p.category_id)
      .filter((v) => v != null) as number[]
    const externalCategoryIds = products
      .map((p) => p.category_external_id)
      .filter((v) => !!v) as string[]
    const supplierIdsRaw = products
      .map((p) => p.supplier_id)
      .filter((v) => v != null) as number[]
    const supplierIds = Array.from(new Set(supplierIdsRaw))

    const mainImageMap: Record<string, string> = {}
    if (ids.length > 0) {
      const { data: imgRows } = await supabase
        .from('store_product_images')
        .select('product_id,url,is_main,order_index')
        .in('product_id', ids)

      const grouped: Record<string, any[]> = {}
      for (const r of imgRows || []) {
        const pid = String((r as any).product_id)
        if (!grouped[pid]) grouped[pid] = []
        grouped[pid].push(r)
      }

      for (const [pid, rows] of Object.entries(grouped)) {
        const main =
          (rows as any[]).find((x) => (x as any).is_main) ||
          (rows as any[]).sort(
            (a, b) =>
              ((a as any).order_index ?? 999) - ((b as any).order_index ?? 999),
          )[0]

        if ((main as any)?.url) {
          mainImageMap[pid] = String((main as any).url)
        }
      }
    }

    const categoryNameMap: Record<string, string> = {}
    if (categoryIds.length > 0) {
      const { data: catRows } = await supabase
        .from('store_categories')
        .select('id,name')
        .in('id', categoryIds)

      for (const r of catRows || []) {
        const id = (r as any).id
        const name = (r as any).name
        if (id != null && name) categoryNameMap[String(id)] = String(name)
      }
    }

    if (externalCategoryIds.length > 0) {
      const { data: extCatRows } = await supabase
        .from('store_categories')
        .select('external_id,name')
        .in('external_id', externalCategoryIds)

      for (const r of extCatRows || []) {
        const eid = (r as any).external_id
        const name = (r as any).name
        if (eid && name) categoryNameMap[String(eid)] = String(name)
      }
    }

    const supplierNameMap: Record<string | number, string> = {}
    if (supplierIds.length > 0) {
      const { data: supRows } = await supabase
        .from('user_suppliers')
        .select('id,supplier_name')
        .in('id', supplierIds as any)

      for (const r of supRows || []) {
        const id = (r as any).id
        const name = (r as any).supplier_name
        if (id != null && name) supplierNameMap[id] = String(name)
      }
    }

    const storeLinksByProduct: Record<string, string[]> = {}
    if (!storeId && ids.length > 0) {
      const { data: linkRows } = await supabase
        .from('store_product_links')
        .select('product_id,store_id,is_active')
        .in('product_id', ids)

      for (const r of linkRows || []) {
        const pid = String((r as any).product_id)
        const sid =
          (r as any)?.store_id != null ? String((r as any).store_id) : ''
        const active = (r as any)?.is_active !== false
        if (!storeLinksByProduct[pid]) storeLinksByProduct[pid] = []
        if (sid && active) storeLinksByProduct[pid].push(sid)
      }
    }

    const paramsMap: Record<string, Record<string, string>> = {}
    if (ids.length > 0) {
      const { data: paramRows } = await supabase
        .from('store_product_params')
        .select('product_id,name,value')
        .in('product_id', ids)
        .in('name', ['docket', 'docket_ua'])

      for (const pr of paramRows || []) {
        const pid = String((pr as any).product_id)
        if (!paramsMap[pid]) paramsMap[pid] = {}
        paramsMap[pid][String((pr as any).name)] = String((pr as any).value)
      }
    }

    const aggregated: ProductRow[] = products.map((p) => {
      const pid = String(p.id)
      const docket = p.docket ?? paramsMap[pid]?.['docket'] ?? null
      const docketUa = p.docket_ua ?? paramsMap[pid]?.['docket_ua'] ?? null
      const overrideExt = customExtByPid[pid] || null

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
