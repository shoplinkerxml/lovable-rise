import { createClient } from '@supabase/supabase-js'
import type { Database } from '../_shared/database-types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  })

type RequestBody = {
  store_id?: string
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

// Утилита для получения публичного URL изображения
function getImagePublicUrl(r2Key: string | null, fallbackUrl: string): string {
  if (!r2Key) return fallbackUrl

  const host = Deno.env.get('R2_PUBLIC_HOST') || ''
  const baseUrl = Deno.env.get('R2_PUBLIC_BASE_URL') || Deno.env.get('IMAGE_BASE_URL') || ''

  let imageBase = ''
  
  if (host) {
    const cleanHost = host.startsWith('http') ? host : `https://${host}`
    try {
      const url = new URL(cleanHost)
      imageBase = `${url.protocol}//${url.host}`
    } catch {
      imageBase = cleanHost
    }
  } else if (baseUrl) {
    try {
      const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`)
      const origin = `${url.protocol}//${url.host}`
      const path = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '')
      imageBase = path ? `${origin}/${path}` : origin
    } catch {
      imageBase = baseUrl
    }
  }

  return imageBase ? `${imageBase}/${r2Key}` : fallbackUrl
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const supabaseClient = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Проверка аутентификации
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.log('User authentication failed', { error: userError?.message })
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated successfully', { userId: user.id })

    // Парсинг body
    let body: RequestBody = {}
    try {
      body = await req.json()
    } catch {
      // Используем дефолтные значения
    }

    const storeId = body.store_id || null
    const rawLimit = typeof body.limit === 'number' ? body.limit : DEFAULT_LIMIT
    const rawOffset = typeof body.offset === 'number' ? body.offset : 0

    const offset = Math.max(0, rawOffset)
    const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT)

    console.log('Fetching products', { storeId, limit, offset, userId: user.id })

    let products: any[] = []
    let totalCount = 0
    let customCategoryMap: Record<string, string> = {}

    if (storeId) {
      // Проверка доступа к магазину
      const { data: store, error: storeError } = await supabaseClient
        .from('user_stores')
        .select('id, user_id')
        .eq('id', storeId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (storeError) {
        console.log('Store check error', { error: storeError.message })
        return jsonResponse(
          { error: 'Failed to verify store access' },
          { status: 500 }
        )
      }

      if (!store) {
        console.log('Store not found or access denied', { storeId, userId: user.id })
        return jsonResponse(
          { error: 'Store not found or access denied' },
          { status: 403 }
        )
      }

      // Получение продуктов конкретного магазина
      const { data, error, count } = await supabaseClient
        .from('store_product_links')
        .select(
          'product_id, store_id, is_active, custom_name, custom_description, custom_price, custom_price_old, custom_price_promo, custom_stock_quantity, custom_available, custom_category_id, store_products!inner(*)',
          { count: 'exact' }
        )
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false, foreignTable: 'store_products' })
        .range(offset, offset + limit - 1)

      if (error) {
        console.log('Products fetch error (store links)', { error: error.message, storeId })
        return jsonResponse(
          {
            products: [],
            page: { limit, offset, hasMore: false, nextOffset: null, total: 0 },
          }
        )
      }

      totalCount = count ?? 0

      products = (data || []).map((row: any) => {
        const base = row.store_products || {}
        const productId = String(base.id)

        if (row.custom_category_id) {
          customCategoryMap[productId] = String(row.custom_category_id)
        }

        return {
          id: productId,
          store_id: String(base.store_id),
          supplier_id: base.supplier_id ?? null,
          external_id: base.external_id ?? null,
          name: row.custom_name ?? base.name ?? null,
          name_ua: base.name_ua ?? null,
          docket: base.docket ?? null,
          docket_ua: base.docket_ua ?? null,
          description: row.custom_description ?? base.description ?? null,
          description_ua: base.description_ua ?? null,
          vendor: base.vendor ?? null,
          article: base.article ?? null,
          category_id: base.category_id ?? null,
          category_external_id: row.custom_category_id 
            ? String(row.custom_category_id)
            : base.category_external_id ?? null,
          currency_id: base.currency_id ?? null,
          currency_code: base.currency_code ?? null,
          price: row.custom_price ?? base.price ?? null,
          price_old: row.custom_price_old ?? base.price_old ?? null,
          price_promo: row.custom_price_promo ?? base.price_promo ?? null,
          stock_quantity: row.custom_stock_quantity ?? base.stock_quantity ?? 0,
          available: row.custom_available ?? base.available ?? true,
          state: base.state ?? 'new',
          created_at: base.created_at ?? new Date().toISOString(),
          updated_at: base.updated_at ?? new Date().toISOString(),
          is_active: row.is_active !== false,
        }
      })
    } else {
      // Получение всех продуктов пользователя через магазины
      const { data: userStores } = await supabaseClient
        .from('user_stores')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (!userStores || userStores.length === 0) {
        console.log('No stores found for user', { userId: user.id })
        return jsonResponse({
          products: [],
          page: { limit, offset, hasMore: false, nextOffset: null, total: 0 },
        })
      }

      const storeIds = userStores.map((s: any) => s.id)

      // Получаем продукты через store_id
      const { data, error, count } = await supabaseClient
        .from('store_products')
        .select('*', { count: 'exact' })
        .in('store_id', storeIds)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.log('Products fetch error (all)', { error: error.message })
        return jsonResponse(
          {
            products: [],
            page: { limit, offset, hasMore: false, nextOffset: null, total: 0 },
          }
        )
      }

      products = data || []
      totalCount = count ?? 0
    }

    if (products.length === 0) {
      console.log('No products found')
      return jsonResponse({
        products: [],
        page: { limit, offset, hasMore: false, nextOffset: null, total: totalCount },
      })
    }

    const productIds = products.map((p) => String(p.id))
    const categoryIds = products
      .map((p) => p.category_id)
      .filter((id): id is number => id != null)
    
    const externalCategoryIds = Array.from(
      new Set([
        ...products.map((p) => p.category_external_id).filter(Boolean),
        ...Object.values(customCategoryMap),
      ])
    )

    const supplierIds = Array.from(
      new Set(
        products
          .map((p) => p.supplier_id)
          .filter((id): id is number => id != null)
      )
    )

    // Параллельное получение связанных данных
    const [
      { data: images },
      { data: categoriesById },
      { data: categoriesByExtId },
      { data: suppliers },
      { data: params },
      { data: links },
    ] = await Promise.all([
      productIds.length > 0
        ? supabaseClient
            .from('store_product_images')
            .select('product_id, url, is_main, order_index, r2_key_original')
            .in('product_id', productIds)
        : Promise.resolve({ data: [] }),
      categoryIds.length > 0
        ? supabaseClient
            .from('store_categories')
            .select('id, name')
            .in('id', categoryIds)
        : Promise.resolve({ data: [] }),
      externalCategoryIds.length > 0
        ? supabaseClient
            .from('store_categories')
            .select('external_id, name')
            .in('external_id', externalCategoryIds)
        : Promise.resolve({ data: [] }),
      supplierIds.length > 0
        ? supabaseClient
            .from('user_suppliers')
            .select('id, supplier_name')
            .in('id', supplierIds)
        : Promise.resolve({ data: [] }),
      productIds.length > 0
        ? supabaseClient
            .from('store_product_params')
            .select('product_id, name, value')
            .in('product_id', productIds)
            .in('name', ['docket', 'docket_ua'])
        : Promise.resolve({ data: [] }),
      !storeId && productIds.length > 0
        ? supabaseClient
            .from('store_product_links')
            .select('product_id, store_id, is_active, custom_category_id')
            .in('product_id', productIds)
            .eq('is_active', true)
        : Promise.resolve({ data: [] }),
    ])

    // Построение map для главных изображений
    const mainImageMap: Record<string, string> = {}
    const imagesByProduct: Record<string, any[]> = {}

    for (const img of images || []) {
      const productId = String(img.product_id)
      if (!imagesByProduct[productId]) {
        imagesByProduct[productId] = []
      }
      imagesByProduct[productId].push(img)
    }

    for (const [productId, imgs] of Object.entries(imagesByProduct)) {
      const mainImage = imgs
        .sort((a, b) => {
          if (a.is_main && !b.is_main) return -1
          if (!a.is_main && b.is_main) return 1
          return (a.order_index ?? 9999) - (b.order_index ?? 9999)
        })[0]

      if (mainImage) {
        mainImageMap[productId] = getImagePublicUrl(
          mainImage.r2_key_original,
          mainImage.url
        )
      }
    }

    // Построение map для категорий
    const categoryNameMap: Record<string, string> = {}
    for (const cat of categoriesById || []) {
      categoryNameMap[String(cat.id)] = cat.name
    }
    for (const cat of categoriesByExtId || []) {
      if (cat.external_id) {
        categoryNameMap[String(cat.external_id)] = cat.name
      }
    }

    // Построение map для поставщиков
    const supplierNameMap: Record<number, string> = {}
    for (const sup of suppliers || []) {
      supplierNameMap[sup.id] = sup.supplier_name
    }

    // Построение map для параметров
    const paramsMap: Record<string, Record<string, string>> = {}
    for (const param of params || []) {
      const productId = String(param.product_id)
      if (!paramsMap[productId]) {
        paramsMap[productId] = {}
      }
      paramsMap[productId][param.name] = param.value
    }

    // Построение map для связанных магазинов и кастомных категорий
    const linkedStoresMap: Record<string, string[]> = {}
    const linkCustomCategoryMap: Record<string, string[]> = {}

    for (const link of links || []) {
      const productId = String(link.product_id)

      if (link.store_id) {
        if (!linkedStoresMap[productId]) {
          linkedStoresMap[productId] = []
        }
        linkedStoresMap[productId].push(String(link.store_id))
      }

      if (link.custom_category_id) {
        if (!linkCustomCategoryMap[productId]) {
          linkCustomCategoryMap[productId] = []
        }
        linkCustomCategoryMap[productId].push(String(link.custom_category_id))
      }
    }

    // Агрегация финальных данных
    const aggregated = products.map((product) => {
      const productId = String(product.id)
      const productParams = paramsMap[productId] || {}

      // Определяем категорию с учетом кастомной
      let categoryName: string | undefined
      const customCatId = customCategoryMap[productId]
      
      if (customCatId) {
        categoryName = categoryNameMap[customCatId]
      } else if (!storeId && linkCustomCategoryMap[productId]?.length === 1) {
        categoryName = categoryNameMap[linkCustomCategoryMap[productId][0]]
      } else if (product.category_id) {
        categoryName = categoryNameMap[String(product.category_id)]
      } else if (product.category_external_id) {
        categoryName = categoryNameMap[String(product.category_external_id)]
      }

      return {
        ...product,
        docket: product.docket ?? productParams.docket ?? null,
        docket_ua: product.docket_ua ?? productParams.docket_ua ?? null,
        mainImageUrl: mainImageMap[productId] || undefined,
        categoryName,
        supplierName: product.supplier_id 
          ? supplierNameMap[product.supplier_id]
          : undefined,
        linkedStoreIds: linkedStoresMap[productId] || [],
      }
    })

    const hasMore = offset + limit < totalCount
    const nextOffset = hasMore ? offset + limit : null

    console.log('Products fetched successfully', { count: aggregated.length, total: totalCount })

    return jsonResponse({
      products: aggregated,
      page: {
        limit,
        offset,
        hasMore,
        nextOffset,
        total: totalCount,
      },
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})