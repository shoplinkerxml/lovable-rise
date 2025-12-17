import { createClient } from '@supabase/supabase-js'
import type { Database } from '../_shared/database-types.ts'

// Конфигурация
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const R2_PUBLIC_HOST = Deno.env.get('R2_PUBLIC_HOST') || ''
const R2_PUBLIC_BASE_URL = Deno.env.get('R2_PUBLIC_BASE_URL') || ''

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const CACHE_TTL = {
  CATEGORIES: 30 * 60 * 1000,  // 30 минут
  SUPPLIERS: 30 * 60 * 1000,
  PRODUCTS: 2 * 60 * 1000,      // 2 минуты
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

// Кэш
type CacheEntry<T> = { data: T; timestamp: number }

class Cache {
  private categories = new Map<string, CacheEntry<Record<string, string>>>()
  private suppliers = new Map<string, CacheEntry<Record<number, string>>>()
  private products = new Map<string, CacheEntry<any>>()

  private isExpired(entry: CacheEntry<any>, ttl: number) {
    return Date.now() - entry.timestamp > ttl
  }

  getCategories(userId: string) {
    const entry = this.categories.get(userId)
    if (!entry || this.isExpired(entry, CACHE_TTL.CATEGORIES)) return null
    return entry.data
  }

  setCategories(userId: string, data: Record<string, string>) {
    this.categories.set(userId, { data, timestamp: Date.now() })
  }

  getSuppliers(userId: string) {
    const entry = this.suppliers.get(userId)
    if (!entry || this.isExpired(entry, CACHE_TTL.SUPPLIERS)) return null
    return entry.data
  }

  setSuppliers(userId: string, data: Record<number, string>) {
    this.suppliers.set(userId, { data, timestamp: Date.now() })
  }

  getProducts(key: string) {
    const entry = this.products.get(key)
    if (!entry || this.isExpired(entry, CACHE_TTL.PRODUCTS)) return null
    return entry.data
  }

  setProducts(key: string, data: any) {
    this.products.set(key, { data, timestamp: Date.now() })
  }
}

const cache = new Cache()

// Утилиты
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS_HEADERS })

function getImagePublicUrl(r2Key: string | null, fallbackUrl: string): string {
  if (!r2Key) return fallbackUrl
  const base = R2_PUBLIC_HOST || R2_PUBLIC_BASE_URL
  if (!base) return fallbackUrl
  const cleanBase = base.startsWith('http') ? base : `https://${base}`
  return `${cleanBase}/${r2Key}`
}

// Загрузка категорий с кэшем
async function getCategoriesMap(client: any, userId: string) {
  const cached = cache.getCategories(userId)
  if (cached) return cached

  const { data: stores } = await client
    .from('user_stores')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!stores?.length) return {}

  const { data: categories } = await client
    .from('store_categories')
    .select('id, external_id, name')
    .in('store_id', stores.map((s: any) => s.id))

  const map: Record<string, string> = {}
  for (const cat of categories || []) {
    if (cat.id) map[String(cat.id)] = cat.name
    if (cat.external_id) map[String(cat.external_id)] = cat.name
  }

  cache.setCategories(userId, map)
  return map
}

// Загрузка поставщиков с кэшем
async function getSuppliersMap(client: any, userId: string) {
  const cached = cache.getSuppliers(userId)
  if (cached) return cached

  const { data: suppliers } = await client
    .from('user_suppliers')
    .select('id, supplier_name')
    .eq('user_id', userId)

  const map: Record<number, string> = {}
  for (const sup of suppliers || []) {
    map[sup.id] = sup.supplier_name
  }

  cache.setSuppliers(userId, map)
  return map
}

// Получение продуктов конкретного магазина через VIEW
async function fetchStoreProducts(
  client: any,
  userId: string,
  storeId: string,
  limit: number,
  offset: number,
  categoriesMap: Record<string, string>
) {
  // Проверка доступа
  const { data: store } = await client
    .from('user_stores')
    .select('id')
    .eq('id', storeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!store) {
    return { error: 'Store not found or access denied', status: 403 }
  }

  // Запрос через VIEW + кастомные данные
  const [productsResult, linksResult] = await Promise.all([
    client
      .from('products_with_details')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    client
      .from('store_product_links')
      .select('product_id, custom_name, custom_description, custom_price, custom_price_old, custom_price_promo, custom_stock_quantity, custom_available, custom_category_id')
      .eq('store_id', storeId)
      .eq('is_active', true)
  ])

  if (productsResult.error) {
    return { products: [], totalCount: 0 }
  }

  // Map кастомных данных
  const customMap = new Map()
  for (const link of linksResult.data || []) {
    customMap.set(String(link.product_id), link)
  }

  // Обработка продуктов
  const products = (productsResult.data || []).map((p: any) => {
    const custom = customMap.get(String(p.id))
    let categoryName = p.category_name

    if (custom?.custom_category_id) {
      categoryName = categoriesMap[String(custom.custom_category_id)] || categoryName
    }

    return {
      id: String(p.id),
      store_id: String(p.store_id),
      supplier_id: p.supplier_id,
      external_id: p.external_id,
      name: custom?.custom_name ?? p.name,
      name_ua: p.name_ua,
      description: custom?.custom_description ?? p.description,
      description_ua: p.description_ua,
      vendor: p.vendor,
      article: p.article,
      category_id: p.category_id,
      category_external_id: custom?.custom_category_id 
        ? String(custom.custom_category_id)
        : p.category_external_id,
      currency_id: p.currency_id,
      currency_code: p.currency_code,
      price: custom?.custom_price ?? p.price,
      price_old: custom?.custom_price_old ?? p.price_old,
      price_promo: custom?.custom_price_promo ?? p.price_promo,
      stock_quantity: custom?.custom_stock_quantity ?? p.stock_quantity ?? 0,
      available: custom?.custom_available ?? p.available ?? true,
      state: p.state ?? 'new',
      created_at: p.created_at,
      updated_at: p.updated_at,
      is_active: true,
      mainImageUrl: p.main_image_key 
        ? getImagePublicUrl(p.main_image_key, p.main_image_url)
        : undefined,
      categoryName,
      supplierName: p.supplier_name,
      linkedStoreIds: [String(storeId)],
    }
  })

  return {
    products,
    totalCount: productsResult.count ?? 0,
  }
}

// Получение всех продуктов пользователя через VIEW
async function fetchAllProducts(
  client: any,
  userId: string,
  limit: number,
  offset: number,
  categoriesMap: Record<string, string>
) {
  const { data: stores } = await client
    .from('user_stores')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!stores?.length) {
    return { products: [], totalCount: 0 }
  }

  const storeIds = stores.map((s: any) => s.id)

  // Запрос через VIEW
  const { data, error, count } = await client
    .from('products_with_details')
    .select('*', { count: 'exact' })
    .in('store_id', storeIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data?.length) {
    return { products: [], totalCount: count ?? 0 }
  }

  const productIds = data.map((p: any) => String(p.id))

  // Связи магазинов
  const { data: links } = await client
    .from('store_product_links')
    .select('product_id, store_id, is_active, custom_category_id')
    .in('product_id', productIds)
    .eq('is_active', true)

  const linksMap = new Map()
  for (const link of links || []) {
    const pid = String(link.product_id)
    if (!linksMap.has(pid)) {
      linksMap.set(pid, { storeIds: [], customCategoryId: null })
    }
    linksMap.get(pid).storeIds.push(String(link.store_id))
    if (link.custom_category_id && linksMap.get(pid).storeIds.length === 1) {
      linksMap.get(pid).customCategoryId = String(link.custom_category_id)
    }
  }

  // Обработка продуктов
  const products = data.map((p: any) => {
    const pid = String(p.id)
    const linkInfo = linksMap.get(pid)
    let categoryName = p.category_name

    if (linkInfo?.customCategoryId && linkInfo.storeIds.length === 1) {
      categoryName = categoriesMap[linkInfo.customCategoryId] || categoryName
    }

    return {
      id: pid,
      store_id: String(p.store_id),
      supplier_id: p.supplier_id,
      external_id: p.external_id,
      name: p.name,
      name_ua: p.name_ua,
      description: p.description,
      description_ua: p.description_ua,
      vendor: p.vendor,
      article: p.article,
      category_id: p.category_id,
      category_external_id: p.category_external_id,
      currency_id: p.currency_id,
      currency_code: p.currency_code,
      price: p.price,
      price_old: p.price_old,
      price_promo: p.price_promo,
      stock_quantity: p.stock_quantity ?? 0,
      available: p.available ?? true,
      state: p.state ?? 'new',
      created_at: p.created_at,
      updated_at: p.updated_at,
      is_active: true,
      mainImageUrl: p.main_image_key 
        ? getImagePublicUrl(p.main_image_key, p.main_image_url)
        : undefined,
      categoryName,
      supplierName: p.supplier_name,
      linkedStoreIds: linkInfo?.storeIds || [],
    }
  })

  return {
    products,
    totalCount: count ?? 0,
  }
}

// Основной обработчик
Deno.serve(async (req: Request): Promise<Response> => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Configuration error' }, 500)
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Аутентификация
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await client.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    // Параметры
    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    const storeId = body.store_id || null
    const limit = Math.min(Math.max(1, body.limit ?? DEFAULT_LIMIT), MAX_LIMIT)
    const offset = Math.max(0, body.offset ?? 0)

    // Кэш ключ
    const cacheKey = `${user.id}:${storeId || 'all'}:${limit}:${offset}`
    const cachedResult = cache.getProducts(cacheKey)
    
    if (cachedResult) {
      console.log('Cache hit:', cacheKey)
      const { products, totalCount } = cachedResult
      return jsonResponse({
        products,
        page: {
          limit,
          offset,
          hasMore: offset + limit < totalCount,
          nextOffset: offset + limit < totalCount ? offset + limit : null,
          total: totalCount,
        },
      })
    }

    // Загрузка справочников
    const [categoriesMap, suppliersMap] = await Promise.all([
      getCategoriesMap(client, user.id),
      getSuppliersMap(client, user.id),
    ])

    // Получение продуктов
    const result = storeId
      ? await fetchStoreProducts(client, user.id, storeId, limit, offset, categoriesMap)
      : await fetchAllProducts(client, user.id, limit, offset, categoriesMap)

    if ('error' in result) {
      return jsonResponse({ error: result.error }, result.status)
    }

    const { products, totalCount } = result

    // Кэшируем результат
    cache.setProducts(cacheKey, { products, totalCount })

    const hasMore = offset + limit < totalCount
    const nextOffset = hasMore ? offset + limit : null

    return jsonResponse({
      products,
      page: { limit, offset, hasMore, nextOffset, total: totalCount },
    })

  } catch (error) {
    console.error('Error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})