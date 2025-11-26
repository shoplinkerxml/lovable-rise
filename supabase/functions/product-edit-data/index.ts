import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Body = { product_id: string; store_id?: string | null }

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
  currency_code?: string | null
  price?: number | null
  price_old?: number | null
  price_promo?: number | null
  stock_quantity: number
  available: boolean
  state: string
  created_at: string
  updated_at: string
}

type ProductParam = { name: string; value: string; order_index: number; paramid?: string | null; valueid?: string | null }
type ProductImage = { id?: string; product_id?: string; url: string; order_index: number; is_main: boolean; alt_text?: string | null }

const LOOKUP_TTL = 120000
const lookupCache: {
  suppliers?: Array<{ id: string; supplier_name: string }>
  suppliersTs: number
  currencies?: Array<{ id: number; name: string; code: string; status: boolean | null }>
  currenciesTs: number
} = (globalThis as any).__lookupCache || { suppliersTs: 0, currenciesTs: 0 }
;(globalThis as any).__lookupCache = lookupCache

async function getSuppliersCached(supabase: any): Promise<Array<{ id: string; supplier_name: string }>> {
  const fresh = lookupCache.suppliers && Date.now() - lookupCache.suppliersTs < LOOKUP_TTL
  if (fresh) return lookupCache.suppliers as Array<{ id: string; supplier_name: string }>
  const { data } = await supabase.from('user_suppliers').select('id,supplier_name').order('supplier_name')
  const rows = (data || []).map((s: any) => ({ id: String(s.id), supplier_name: String(s.supplier_name || '') }))
  lookupCache.suppliers = rows
  lookupCache.suppliersTs = Date.now()
  return rows
}

async function getCurrenciesCached(supabase: any): Promise<Array<{ id: number; name: string; code: string; status: boolean | null }>> {
  const fresh = lookupCache.currencies && Date.now() - lookupCache.currenciesTs < LOOKUP_TTL
  if (fresh) return lookupCache.currencies as Array<{ id: number; name: string; code: string; status: boolean | null }>
  const { data } = await supabase.from('currencies').select('id,name,code,status').eq('status', true).order('name')
  const rows = (data || []).map((c: any) => ({ id: Number(c.id), name: String(c.name || ''), code: String(c.code || ''), status: c.status ?? null }))
  lookupCache.currencies = rows
  lookupCache.currenciesTs = Date.now()
  return rows
}

function parseQuery(req: Request): Body {
  const url = new URL(req.url)
  const pid = url.searchParams.get('product_id') || ''
  const sid = url.searchParams.get('store_id')
  return { product_id: pid, store_id: sid }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const body: Body = req.method === 'GET' ? parseQuery(req) : await req.json().catch(() => ({ product_id: '', store_id: '' } as Body))
    const productId = String(body.product_id || '')
    let storeId = body.store_id ? String(body.store_id) : ''
    if (!productId) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400, headers: corsHeaders })
    }

    const url = Deno.env.get('SUPABASE_URL') || ''
    const key = Deno.env.get('SUPABASE_ANON_KEY') || ''
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'misconfigured_supabase' }), { status: 400, headers: corsHeaders })
    }
    const supabase = createClient(url, key, { global: { headers: authHeader ? { Authorization: `Bearer ${token}` } : {} } })

    const [{ data: productRow, error: productErr }] = await Promise.all([
      supabase.from('store_products').select('*').eq('id', productId).maybeSingle(),
    ])

    if (productErr) {
      return new Response(JSON.stringify({ error: 'product_not_found' }), { status: 404, headers: corsHeaders })
    }

    const product = (productRow || null) as Product | null
    if (!storeId && product?.store_id) storeId = String(product.store_id)

    let supplier: { id: number; supplier_name: string } | null = null
    let categoryName: string | null = null
    const suppliers = await getSuppliersCached(supabase)
    const currencies = await getCurrenciesCached(supabase)
    let categories: Array<{ id: string; name: string; external_id: string; supplier_id: string; parent_external_id: string | null }> = []
    const supplierCategoriesMap: Record<string, Array<{ id: string; name: string; external_id: string; supplier_id: string; parent_external_id: string | null }>> = {}
    if (product) {
      const [supRes, catByIdRes, catByExtRes] = await Promise.all([
        product.supplier_id != null ? supabase.from('user_suppliers').select('id,supplier_name').eq('id', product.supplier_id).maybeSingle() : Promise.resolve({ data: null } as any),
        product.category_id != null ? supabase.from('store_categories').select('id,name').eq('id', product.category_id).maybeSingle() : Promise.resolve({ data: null } as any),
        product.category_external_id ? supabase.from('store_categories').select('external_id,name').eq('external_id', product.category_external_id).maybeSingle() : Promise.resolve({ data: null } as any)
      ])
      supplier = (supRes as any)?.data || null
      categoryName = (catByIdRes as any)?.data?.name || (catByExtRes as any)?.data?.name || null
      const supplierIds = (suppliers || []).map(s => Number(s.id)).filter((n) => Number.isFinite(n))
      if (supplierIds.length > 0) {
        const { data: catsAll } = await supabase
          .from('store_categories')
          .select('id,name,external_id,supplier_id,parent_external_id')
          .in('supplier_id', supplierIds)
          .order('name')
        const rows = (catsAll || []) as any[]
        for (const c of rows) {
          const key = String(c.supplier_id)
          const item = {
            id: String(c.id),
            name: String(c.name || ''),
            external_id: String(c.external_id || ''),
            supplier_id: String(c.supplier_id || ''),
            parent_external_id: c.parent_external_id === null || c.parent_external_id === undefined ? null : String(c.parent_external_id)
          }
          if (!supplierCategoriesMap[key]) supplierCategoriesMap[key] = []
          supplierCategoriesMap[key].push(item)
        }
        if (product.supplier_id != null) {
          categories = (supplierCategoriesMap[String(product.supplier_id)] || [])
        }
      }
    }

    const [{ data: linkRow }, { data: imageRows }, { data: paramRows }, { data: shopRow }, { data: sscRows }] = await Promise.all([
      storeId ? supabase.from('store_product_links').select('product_id,store_id,is_active,custom_name,custom_description,custom_price,custom_price_old,custom_price_promo,custom_stock_quantity,custom_available,custom_category_id').eq('product_id', productId).eq('store_id', storeId).maybeSingle() : Promise.resolve({ data: null } as any),
      supabase.from('store_product_images').select('id,product_id,url,order_index,is_main').eq('product_id', productId).order('order_index'),
      supabase.from('store_product_params').select('id,product_id,name,value,order_index,paramid,valueid').eq('product_id', productId).order('order_index'),
      storeId ? supabase.from('user_stores').select('id,store_name').eq('id', storeId).maybeSingle() : Promise.resolve({ data: null } as any),
      storeId ? supabase.from('store_store_categories').select('id,store_id,category_id,custom_name,is_active,external_id, store_categories:category_id(id,external_id,name,parent_external_id,rz_id)').eq('store_id', storeId).order('id') : Promise.resolve({ data: [] } as any),
    ])

    const images = ((imageRows || []) as Array<any>).map((img, index) => ({
      id: img.id != null ? String(img.id) : undefined,
      product_id: img.product_id != null ? String(img.product_id) : productId,
      url: String(img.url || ''),
      order_index: typeof img.order_index === 'number' ? img.order_index : index,
      is_main: img.is_main === true,
      alt_text: img.alt_text ?? null,
    })) as ProductImage[]

    const params = ((paramRows || []) as Array<any>).map((p, index) => ({
      id: p.id != null ? String(p.id) : undefined,
      product_id: p.product_id != null ? String(p.product_id) : productId,
      name: String(p.name || ''),
      value: String(p.value || ''),
      order_index: typeof p.order_index === 'number' ? p.order_index : index,
      paramid: p.paramid ?? null,
      valueid: p.valueid ?? null,
    })) as ProductParam[]

    const storeCategories = ((sscRows || []) as Array<any>).map((r) => {
      const sc = (r as any)?.store_categories || {};
      return {
        store_category_id: Number(r.id),
        store_id: String(r.store_id),
        category_id: Number(r.category_id),
        name: String((r as any).custom_name ?? sc.name ?? ''),
        store_external_id: (r as any).external_id ?? null,
        is_active: !!(r as any).is_active,
      };
    });

    const payload = {
      product,
      link: linkRow || null,
      images,
      params,
      supplier,
      categoryName,
      shop: shopRow || null,
      storeCategories,
      suppliers,
      currencies,
      categories,
      supplierCategoriesMap,
    }

    return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders })
  } catch (e) {
    const msg = (e as any)?.message || 'aggregation_failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})
