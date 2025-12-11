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

type SupplierRow = { id: string; supplier_name: string }
type CurrencyRow = { id: number; name: string; code: string; status: boolean | null }
type CategoryRow = { id: string; name: string; external_id: string; supplier_id: string; parent_external_id: string | null }

const LOOKUP_TTL = 120_000

const lookupCache: {
  suppliers?: SupplierRow[]
  suppliersTs: number
  currencies?: CurrencyRow[]
  currenciesTs: number
} = (globalThis as any).__newProductLookupCache || { suppliersTs: 0, currenciesTs: 0 }

;(globalThis as any).__newProductLookupCache = lookupCache

async function getSuppliersCached(supabase: any): Promise<SupplierRow[]> {
  const fresh = lookupCache.suppliers && Date.now() - lookupCache.suppliersTs < LOOKUP_TTL
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
  const fresh = lookupCache.currencies && Date.now() - lookupCache.currenciesTs < LOOKUP_TTL
  if (fresh) return lookupCache.currencies as CurrencyRow[]

  const { data } = await supabase
    .from('currencies')
    .select('id,name,code,status')
    .eq('status', true)
    .order('code')

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : ''

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: authHeader && token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    })

    // 1. Справочники: постачальники + валюти
    const [suppliers, currencies] = await Promise.all([
      getSuppliersCached(supabase),
      getCurrenciesCached(supabase),
    ])

    // 2. Категории для всех поставщиков одним запросом
    const supplierIdsAll = suppliers
      .map((s) => Number(s.id))
      .filter((n) => Number.isFinite(n))

    let supplierCategoriesMap: Record<string, CategoryRow[]> = {}
    if (supplierIdsAll.length > 0) {
      const { data: catsAll } = await supabase
        .from('store_categories')
        .select('id,name,external_id,supplier_id,parent_external_id')
        .in('supplier_id', supplierIdsAll)
        .order('name')

      const catsAllRows = (catsAll || []) as any[]
      for (const c of catsAllRows) {
        const key = String(c.supplier_id)
        const item: CategoryRow = {
          id: String(c.id),
          name: String(c.name || ''),
          external_id: String(c.external_id || ''),
          supplier_id: String(c.supplier_id || ''),
          parent_external_id: c.parent_external_id == null ? null : String(c.parent_external_id),
        }
        if (!supplierCategoriesMap[key]) supplierCategoriesMap[key] = []
        supplierCategoriesMap[key].push(item)
      }
    }

    const payload = {
      suppliers,
      currencies,
      supplierCategoriesMap,
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (e: any) {
    const msg = e?.message || 'aggregation_failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})

