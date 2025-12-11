import { createClient } from '@supabase/supabase-js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type RequestBody = { 
  product_ids?: string[]
  store_ids?: string[] 
}

type DeleteResult = {
  deleted: number
  deletedByStore: Record<string, number>
  categoryNamesByStore?: Record<string, string[]>
}

// Вынесли подсчет активных записей
function countActiveByStore(rows: any[]): Record<string, number> {
  return rows.reduce((acc, row) => {
    const storeId = String(row?.store_id)
    const isActive = row?.is_active !== false
    
    if (storeId && isActive) {
      acc[storeId] = (acc[storeId] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
}

// Единая функция для удаления с предварительной выборкой
async function deleteLinks(
  supabase: any,
  filters: { productIds?: string[]; storeIds: string[] }
): Promise<DeleteResult> {
  // Строим запрос на выборку
  let selectQuery = supabase
    .from('store_product_links')
    .select('store_id,product_id,is_active')
    .in('store_id', filters.storeIds)

  if (filters.productIds?.length) {
    selectQuery = selectQuery.in('product_id', filters.productIds)
  }

  const { data: rowsToDelete, error: selectError } = await selectQuery

  if (selectError) {
    throw new Error(`Failed to select records: ${selectError.message}`)
  }

  // Подсчитываем до удаления
  const deletedByStore = countActiveByStore(rowsToDelete || [])

  // Строим запрос на удаление (те же условия)
  let deleteQuery = supabase
    .from('store_product_links')
    .delete()
    .in('store_id', filters.storeIds)

  if (filters.productIds?.length) {
    deleteQuery = deleteQuery.in('product_id', filters.productIds)
  }

  const { error: deleteError } = await deleteQuery

  if (deleteError) {
    throw new Error(`Failed to delete records: ${deleteError.message}`)
  }

  return {
    deleted: rowsToDelete?.length || 0,
    deletedByStore,
  }
}

async function aggregateCategoryNames(supabase: any, storeIds: string[]): Promise<Record<string, string[]>> {
  if (!Array.isArray(storeIds) || storeIds.length === 0) return {}
  const sids = Array.from(new Set(storeIds.map(String).filter(Boolean)))
  const [{ data: links }, { data: maps }] = await Promise.all([
    (supabase as any)
      .from('store_product_links')
      .select('is_active,custom_category_id,store_id,store_products(category_id,category_external_id)')
      .in('store_id', sids),
    (supabase as any)
      .from('store_store_categories')
      .select('store_id,category_id,external_id,is_active')
      .in('store_id', sids),
  ])

  const byStoreCatId: Record<string, Record<string, string | null>> = {}
  for (const m of maps || []) {
    const active = (m as any)?.is_active !== false
    if (!active) continue
    const sid = String((m as any)?.store_id || '')
    const cid = (m as any)?.category_id != null ? String((m as any).category_id) : null
    const ext = (m as any)?.external_id != null ? String((m as any).external_id) : null
    if (!sid || !cid) continue
    if (!byStoreCatId[sid]) byStoreCatId[sid] = {}
    byStoreCatId[sid][cid] = ext || null
  }

  const idsByStore: Record<string, Set<string>> = {}
  const extsByStore: Record<string, Set<string>> = {}
  for (const r of links || []) {
    const active = (r as any)?.is_active !== false
    if (!active) continue
    const sid = String((r as any)?.store_id || '')
    if (!sid) continue

    const linkExt = (r as any)?.custom_category_id != null ? String((r as any).custom_category_id) : null
    const baseCid = (r as any)?.store_products?.category_id != null ? String((r as any).store_products.category_id) : null
    const baseExt = (r as any)?.store_products?.category_external_id != null ? String((r as any).store_products.category_external_id) : null

    if (!idsByStore[sid]) idsByStore[sid] = new Set<string>()
    if (!extsByStore[sid]) extsByStore[sid] = new Set<string>()

    if (linkExt) {
      extsByStore[sid].add(linkExt)
    } else if (baseCid && byStoreCatId[sid] && byStoreCatId[sid][baseCid]) {
      extsByStore[sid].add(String(byStoreCatId[sid][baseCid]))
    } else if (baseExt) {
      extsByStore[sid].add(baseExt)
    } else if (baseCid) {
      idsByStore[sid].add(baseCid)
    }
  }

  const allIdSet = new Set<string>()
  const allExtSet = new Set<string>()
  for (const sid of sids) {
    const ids = Array.from(idsByStore[sid] || [])
    const exts = Array.from(extsByStore[sid] || [])
    for (const v of ids) allIdSet.add(v)
    for (const v of exts) allExtSet.add(v)
  }
  const idListAll = Array.from(allIdSet)
  const extListAll = Array.from(allExtSet)

  const [catByIdRes, catByExtRes] = await Promise.all([
    idListAll.length
      ? (supabase as any).from('store_categories').select('id,name').in('id', idListAll)
      : Promise.resolve({ data: [] }),
    extListAll.length
      ? (supabase as any).from('store_categories').select('external_id,name').in('external_id', extListAll)
      : Promise.resolve({ data: [] }),
  ])

  const nameById = new Map<string, string>()
  const nameByExt = new Map<string, string>()
  for (const r of ((catByIdRes as any)?.data || [])) {
    const id = String((r as any)?.id || '')
    const nm = (r as any)?.name
    if (id && nm) nameById.set(id, String(nm))
  }
  for (const r of ((catByExtRes as any)?.data || [])) {
    const ext = String((r as any)?.external_id || '')
    const nm = (r as any)?.name
    if (ext && nm) nameByExt.set(ext, String(nm))
  }

  const results: Record<string, string[]> = {}
  for (const sid of sids) {
    const namesSet = new Set<string>()
    const ids = Array.from(idsByStore[sid] || [])
    const exts = Array.from(extsByStore[sid] || [])
    for (const id of ids) {
      const nm = nameById.get(id)
      if (nm) namesSet.add(nm)
    }
    for (const ext of exts) {
      const nm = nameByExt.get(ext)
      if (nm) namesSet.add(nm)
    }
    results[sid] = Array.from(namesSet).sort((a, b) => a.localeCompare(b))
  }

  return results
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed' }),
      { status: 405, headers: CORS_HEADERS }
    )
  }

  try {
    // Инициализация клиента
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    })

    // Парсинг и валидация
    const body: RequestBody = await req.json().catch(() => ({}))

    const productIds = Array.isArray(body.product_ids)
      ? body.product_ids.filter(Boolean).map(String)
      : []

    const storeIds = Array.isArray(body.store_ids)
      ? body.store_ids.filter(Boolean).map(String)
      : []

    // Ранний выход: нет магазинов = нечего удалять
    if (!storeIds.length) {
      return new Response(
        JSON.stringify({ deleted: 0, deletedByStore: {} }),
        { status: 200, headers: CORS_HEADERS }
      )
    }

  // Удаление с одним набором логики
  const result = await deleteLinks(supabase, {
    productIds: productIds.length ? productIds : undefined,
    storeIds,
  })

    // Собираем имена категорий по задействованным магазинам, чтобы фронт не делал второй запрос
    let categoryNamesByStore: Record<string, string[]> = {}
    try {
      categoryNamesByStore = await aggregateCategoryNames(supabase, storeIds)
    } catch { categoryNamesByStore = {} }

  return new Response(
      JSON.stringify({ ...result, categoryNamesByStore }),
      { status: 200, headers: CORS_HEADERS }
    )

  } catch (error) {
    console.error('Delete operation failed:', error)
    
    return new Response(
      JSON.stringify({
        error: 'bulk_delete_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
