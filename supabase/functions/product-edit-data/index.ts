import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

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

type ProductParam = {
  name: string
  value: string
  order_index: number
  paramid?: string | null
  valueid?: string | null
}

type ProductImage = {
  id?: string
  product_id?: string
  url: string
  order_index: number
  is_main: boolean
  r2_key_card?: string | null
  r2_key_thumb?: string | null
  r2_key_original?: string | null
}

type SupplierRow = { id: string; supplier_name: string }
type CurrencyRow = { id: number; name: string; code: string; status: boolean | null }

type CategoryRow = {
  id: string
  name: string
  external_id: string
  supplier_id: string
  parent_external_id: string | null
}

const LOOKUP_TTL = 120_000

const lookupCache: {
  suppliers?: SupplierRow[]
  suppliersTs: number
  currencies?: CurrencyRow[]
  currenciesTs: number
} = (globalThis as any).__lookupCache || { suppliersTs: 0, currenciesTs: 0 }

;(globalThis as any).__lookupCache = lookupCache

async function getSuppliersCached(supabase: any): Promise<SupplierRow[]> {
  const fresh =
    lookupCache.suppliers && Date.now() - lookupCache.suppliersTs < LOOKUP_TTL
  if (fresh) return lookupCache.suppliers as SupplierRow[]

  const { data } = await supabase
    .from('user_suppliers')
    .select('id,supplier_name')
    .order('supplier_name')

  const rows: SupplierRow[] = (data || []).map((s: any) => ({
    id: String(s.id),
    supplier_name: String(s.supplier_name || ''),
  }))

  lookupCache.suppliers = rows
  lookupCache.suppliersTs = Date.now()
  return rows
}

async function getCurrenciesCached(supabase: any): Promise<CurrencyRow[]> {
  const fresh =
    lookupCache.currencies && Date.now() - lookupCache.currenciesTs < LOOKUP_TTL
  if (fresh) return lookupCache.currencies as CurrencyRow[]

  const { data } = await supabase
    .from('currencies')
    .select('id,name,code,status')
    .eq('status', true)
    .order('name')

  const rows: CurrencyRow[] = (data || []).map((c: any) => ({
    id: Number(c.id),
    name: String(c.name || ''),
    code: String(c.code || ''),
    status: c.status ?? null,
  }))

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

async function parseBody(req: Request): Promise<Body> {
  if (req.method === 'GET') {
    return parseQuery(req)
  }
  try {
    const raw = await req.json()
    const pid = String((raw as any)?.product_id || '')
    const sidRaw = (raw as any)?.store_id
    const sid = sidRaw == null ? null : String(sidRaw)
    return { product_id: pid, store_id: sid }
  } catch {
    return { product_id: '', store_id: null }
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : ''

    const body = await parseBody(req)

    const productId = String(body.product_id || '')
    let storeId = body.store_id ? String(body.store_id) : ''

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'invalid_payload' }),
        { status: 400, headers: corsHeaders },
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global:
        authHeader && token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {},
    })

    // 1-й этап: параллельно тянем товар + справочники
    const [
      { data: productRow, error: productErr },
      suppliers,
      currencies,
    ] = await Promise.all([
      supabase
        .from('store_products')
        .select('*')
        .eq('id', productId)
        .maybeSingle(),
      getSuppliersCached(supabase),
      getCurrenciesCached(supabase),
    ])

    if (productErr) {
      return new Response(
        JSON.stringify({ error: 'product_not_found' }),
        { status: 404, headers: corsHeaders },
      )
    }

    const product = (productRow || null) as Product | null
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'product_not_found' }),
        { status: 404, headers: corsHeaders },
      )
    }

    if (!storeId && product.store_id) {
      storeId = String(product.store_id)
    }

    let supplier: { id: number; supplier_name: string } | null = null
    let categoryName: string | null = null
    let categories: CategoryRow[] = []
    const supplierCategoriesMap: Record<string, CategoryRow[]> = {}

    const supplierIdsAll = suppliers
      .map((s) => Number(s.id))
      .filter((n) => Number.isFinite(n))

    // 2-й этап: всё остальное параллельно
    const supplierId = product.supplier_id ?? null

    const supplierRow =
      supplierId != null
        ? suppliers.find((s) => Number(s.id) === supplierId) || null
        : null

    if (supplierRow) {
      supplier = {
        id: Number(supplierRow.id),
        supplier_name: supplierRow.supplier_name,
      }
    }

    const categoriesAllPromise =
      supplierIdsAll.length > 0
        ? supabase
            .from('store_categories')
            .select(
              'id,name,external_id,supplier_id,parent_external_id',
            )
            .in('supplier_id', supplierIdsAll)
            .order('name')
        : Promise.resolve({ data: [] } as any)

    const linkPromise =
      storeId
        ? supabase
            .from('store_product_links')
            .select(
              'product_id,store_id,is_active,custom_name,custom_description,custom_price,custom_price_old,custom_price_promo,custom_stock_quantity,custom_available,custom_category_id',
            )
            .eq('product_id', productId)
            .eq('store_id', storeId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any)

    const imagesPromise = supabase
      .from('store_product_images')
      .select('id,product_id,url,order_index,is_main,r2_key_card,r2_key_thumb,r2_key_original')
      .eq('product_id', productId)
      .order('order_index')

    const paramsPromise = supabase
      .from('store_product_params')
      .select('id,product_id,name,value,order_index,paramid,valueid')
      .eq('product_id', productId)
      .order('order_index')

    const shopPromise =
      storeId
        ? supabase
            .from('user_stores')
            .select('id,store_name')
            .eq('id', storeId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any)

    const sscPromise =
      storeId
        ? supabase
            .from('store_store_categories')
            .select(
              'id,store_id,category_id,custom_name,is_active,external_id, store_categories:category_id(id,external_id,name,parent_external_id,rz_id)',
            )
            .eq('store_id', storeId)
            .order('id')
        : Promise.resolve({ data: [] } as any)

    const [
      { data: catsAll },
      { data: linkRow },
      imagesResult,
      { data: paramRows },
      { data: shopRow },
      { data: sscRows },
    ] = await Promise.all([
      categoriesAllPromise,
      linkPromise,
      imagesPromise,
      paramsPromise,
      shopPromise,
      sscPromise,
    ])

    const imageRows = imagesResult?.data
    const imageError = imagesResult?.error
    console.log(`[product-edit-data] Images query for product ${productId}:`, { count: imageRows?.length ?? 0, error: imageError?.message ?? null })

    let imageRowsResolved: any[] = Array.isArray(imageRows) ? imageRows : []
    if (imageRowsResolved.length === 0 && storeId) {
      const alt = await supabase
        .from('store_product_links')
        .select('images:store_product_images(id,product_id,url,order_index,is_main,r2_key_card,r2_key_thumb,r2_key_original)')
        .eq('product_id', productId)
        .eq('store_id', storeId)
        .maybeSingle()
      const nested = (alt as any)?.data?.images || []
      if (Array.isArray(nested) && nested.length > 0) imageRowsResolved = nested
    }

    const catsAllRows = (catsAll || []) as any[]
    if (catsAllRows.length > 0) {
      for (const c of catsAllRows) {
        const key = String(c.supplier_id)
        const item: CategoryRow = {
          id: String(c.id),
          name: String(c.name || ''),
          external_id: String(c.external_id || ''),
          supplier_id: String(c.supplier_id || ''),
          parent_external_id:
            c.parent_external_id == null
              ? null
              : String(c.parent_external_id),
        }
        if (!supplierCategoriesMap[key]) supplierCategoriesMap[key] = []
        supplierCategoriesMap[key].push(item)
      }
      if (supplierId != null) {
        categories =
          supplierCategoriesMap[String(supplierId)] || []
      }
    }

    // categoryName из уже загруженных категорий
    if (categories.length > 0) {
      if (product.category_id != null) {
        const cat = categories.find(
          (c) => String(c.id) === String(product.category_id),
        )
        if (cat) categoryName = cat.name
      }
      if (!categoryName && product.category_external_id) {
        const cat = categories.find(
          (c) =>
            String(c.external_id) ===
            String(product.category_external_id),
        )
        if (cat) categoryName = cat.name
      }
    }

    function resolvePublicBase(): string {
      const host = Deno.env.get('R2_PUBLIC_HOST') || ''
      if (host) {
        const h = host.startsWith('http') ? host : `https://${host}`
        try {
          const u = new URL(h)
          return `${u.protocol}//${u.host}`
        } catch {
          return h
        }
      }
      const raw = Deno.env.get('R2_PUBLIC_BASE_URL') || Deno.env.get('IMAGE_BASE_URL') || 'https://pub-b1876983df974fed81acea10f7cbc1c5.r2.dev'
      if (!raw) return 'https://pub-b1876983df974fed81acea10f7cbc1c5.r2.dev'
      try {
        const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
        const origin = `${u.protocol}//${u.host}`
        const path = (u.pathname || '/').replace(/^\/+/, '').replace(/\/+$/, '')
        return path ? `${origin}/${path}` : origin
      } catch {
        return raw
      }
    }
    const imageBase = resolvePublicBase()

    const images: (ProductImage & { images?: { original: string | null; card: string | null; thumb: string | null } })[] = (imageRowsResolved as any[]).map(
      (img, index) => {
        const r2o = img.r2_key_original ? String(img.r2_key_original) : ''
        const r2c = img.r2_key_card ? String(img.r2_key_card) : ''
        const r2t = img.r2_key_thumb ? String(img.r2_key_thumb) : ''
        const originalUrl = r2o && imageBase ? `${imageBase}/${r2o}` : null
        const cardUrl = r2c && imageBase ? `${imageBase}/${r2c}` : null
        const thumbUrl = r2t && imageBase ? `${imageBase}/${r2t}` : null
        const fallbackUrl = String(img.url || '')
        const finalCard = cardUrl || (thumbUrl ? thumbUrl : (fallbackUrl || null))
        const finalThumb = thumbUrl || (cardUrl ? cardUrl : (fallbackUrl || null))
        return {
          id: img.id != null ? String(img.id) : undefined,
          product_id: img.product_id != null ? String(img.product_id) : productId,
          url: finalCard || fallbackUrl,
          order_index: typeof img.order_index === 'number' ? img.order_index : index,
          is_main: img.is_main === true,
          r2_key_card: r2c || null,
          r2_key_thumb: r2t || null,
          r2_key_original: r2o || null,
          thumb_url: finalThumb || null,
          images: { original: originalUrl, card: finalCard, thumb: finalThumb },
        }
      },
    )

    const params: ProductParam[] = ((paramRows || []) as any[]).map(
      (p, index) => ({
        id: p.id != null ? String(p.id) : undefined,
        product_id:
          p.product_id != null ? String(p.product_id) : productId,
        name: String(p.name || ''),
        value: String(p.value || ''),
        order_index:
          typeof p.order_index === 'number'
            ? p.order_index
            : index,
        paramid: p.paramid ?? null,
        valueid: p.valueid ?? null,
      }),
    )

    const storeCategories = ((sscRows || []) as any[]).map((r) => {
      const sc = (r as any)?.store_categories || {}
      return {
        store_category_id: Number(r.id),
        store_id: String(r.store_id),
        category_id: Number(r.category_id),
        name: String((r as any).custom_name ?? sc.name ?? ''),
        store_external_id: (r as any).external_id ?? null,
        is_active: !!(r as any).is_active,
      }
    })

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

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (e: any) {
    const msg = e?.message || 'aggregation_failed'
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: corsHeaders },
    )
  }
})
