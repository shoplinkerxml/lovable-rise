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
  include_categories?: boolean // НОВЫЙ флаг для опционального получения категорий
}

type DeleteResult = {
  deleted: number
  deletedByStore: Record<string, number>
  categoryNamesByStore?: Record<string, string[]>
}

// ✅ ОПТИМИЗАЦИЯ 1: DELETE с RETURNING вместо SELECT + DELETE
async function deleteLinksOptimized(
  supabase: any,
  filters: { productIds?: string[]; storeIds: string[] }
): Promise<{ deleted: any[]; deletedByStore: Record<string, number> }> {
  
  // Строим DELETE запрос с RETURNING
  let deleteQuery = supabase
    .from('store_product_links')
    .delete()
    .in('store_id', filters.storeIds)
    .select('store_id, is_active') // RETURNING только нужные поля

  if (filters.productIds?.length) {
    deleteQuery = deleteQuery.in('product_id', filters.productIds)
  }

  const { data: deletedRows, error: deleteError } = await deleteQuery

  if (deleteError) {
    throw new Error(`Failed to delete records: ${deleteError.message}`)
  }

  // Подсчет удаленных активных записей по магазинам
  const deletedByStore: Record<string, number> = {}
  for (const row of deletedRows || []) {
    const storeId = String(row?.store_id)
    const isActive = row?.is_active !== false
    
    if (storeId && isActive) {
      deletedByStore[storeId] = (deletedByStore[storeId] || 0) + 1
    }
  }

  return {
    deleted: deletedRows || [],
    deletedByStore,
  }
}

// ✅ ОПТИМИЗАЦИЯ 2: Упрощенная функция получения категорий
// Теперь делает 2 запроса вместо 4
async function getCategoryNamesByStore(
  supabase: any,
  storeIds: string[]
): Promise<Record<string, string[]>> {
  if (!storeIds.length) return {}

  // 1 запрос: Получаем все активные связи + категории из store_products
  const { data: links } = await supabase
    .from('store_product_links')
    .select('store_id, custom_category_id, store_products!inner(category_id, category_external_id)')
    .in('store_id', storeIds)
    .eq('is_active', true) // ✅ Фильтрация на уровне БД!

  if (!links?.length) return {}

  // Собираем уникальные ID категорий и external_id
  const categoryIds = new Set<string>()
  const externalIds = new Set<string>()

  for (const link of links) {
    const customCat = link.custom_category_id
    const baseCat = link.store_products?.category_id
    const baseExt = link.store_products?.category_external_id

    if (customCat) externalIds.add(String(customCat))
    else if (baseExt) externalIds.add(String(baseExt))
    else if (baseCat) categoryIds.add(String(baseCat))
  }

  // 2 запрос: Получаем имена категорий одним запросом с OR условием
  const idsArray = Array.from(categoryIds)
  const extsArray = Array.from(externalIds)

  let categoryQuery = supabase
    .from('store_categories')
    .select('id, external_id, name')

  // Используем OR для объединения условий
  const filters = []
  if (idsArray.length) filters.push(`id.in.(${idsArray.join(',')})`)
  if (extsArray.length) filters.push(`external_id.in.(${extsArray.join(',')})`)
  
  if (filters.length) {
    categoryQuery = categoryQuery.or(filters.join(','))
  }

  const { data: categories } = await categoryQuery

  // Создаем мапы для быстрого поиска
  const nameById = new Map<string, string>()
  const nameByExt = new Map<string, string>()

  for (const cat of categories || []) {
    if (cat.id) nameById.set(String(cat.id), cat.name)
    if (cat.external_id) nameByExt.set(String(cat.external_id), cat.name)
  }

  // Группируем по магазинам
  const result: Record<string, Set<string>> = {}

  for (const link of links) {
    const storeId = String(link.store_id)
    if (!result[storeId]) result[storeId] = new Set<string>()

    const customCat = link.custom_category_id
    const baseCat = link.store_products?.category_id
    const baseExt = link.store_products?.category_external_id

    let categoryName: string | undefined

    if (customCat) {
      categoryName = nameByExt.get(String(customCat))
    } else if (baseExt) {
      categoryName = nameByExt.get(String(baseExt))
    } else if (baseCat) {
      categoryName = nameById.get(String(baseCat))
    }

    if (categoryName) {
      result[storeId].add(categoryName)
    }
  }

  // Конвертируем Set в отсортированные массивы
  return Object.fromEntries(
    Object.entries(result).map(([storeId, names]) => [
      storeId,
      Array.from(names).sort((a, b) => a.localeCompare(b))
    ])
  )
}

Deno.serve(async (req) => {
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

    const body: RequestBody = await req.json().catch(() => ({}))

    const productIds = Array.isArray(body.product_ids)
      ? body.product_ids.filter(Boolean).map(String)
      : []

    const storeIds = Array.isArray(body.store_ids)
      ? body.store_ids.filter(Boolean).map(String)
      : []

    const includeCategories = body.include_categories !== false // По умолчанию true для обратной совместимости

    if (!storeIds.length) {
      return new Response(
        JSON.stringify({ deleted: 0, deletedByStore: {} }),
        { status: 200, headers: CORS_HEADERS }
      )
    }

    // ✅ Удаление с RETURNING (1 запрос вместо 2)
    const { deleted, deletedByStore } = await deleteLinksOptimized(supabase, {
      productIds: productIds.length ? productIds : undefined,
      storeIds,
    })

    // ✅ ОПЦИОНАЛЬНО получаем категории (если нужно фронту)
    let categoryNamesByStore: Record<string, string[]> = {}
    
    if (includeCategories) {
      try {
        categoryNamesByStore = await getCategoryNamesByStore(supabase, storeIds)
      } catch (err) {
        console.error('Failed to fetch categories:', err)
        // Не падаем, просто не возвращаем категории
      }
    }

    return new Response(
      JSON.stringify({
        deleted: deleted.length,
        deletedByStore,
        ...(includeCategories && { categoryNamesByStore }),
      }),
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