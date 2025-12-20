import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const REDIS_REST_URL =
  Deno.env.get('UPSTASH_REDIS_REST_URL') || Deno.env.get('REDIS_REST_URL') || ''
const REDIS_REST_TOKEN =
  Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || Deno.env.get('REDIS_REST_TOKEN') || ''
const SHOP_COUNTS_TTL_SECONDS = Math.max(
  5,
  Number(Deno.env.get('SHOP_COUNTS_TTL_SECONDS') || '30') || 30
)
const SHOP_COUNTS_KEY_PREFIX =
  Deno.env.get('SHOP_COUNTS_KEY_PREFIX') || 'shop:counts:'

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
  includeConfig?: boolean
  store_id?: string
  limitOnly?: boolean
  forceCounts?: boolean
}

type ShopCounts = { productsCount: number; categoriesCount: number }

function normalizeCounts(input: any): ShopCounts {
  const products = Math.max(0, Number(input?.productsCount ?? 0) || 0)
  const catsRaw = Math.max(0, Number(input?.categoriesCount ?? 0) || 0)
  return { productsCount: products, categoriesCount: products === 0 ? 0 : catsRaw }
}

async function redisPipeline(commands: any[]): Promise<any[] | null> {
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) return null
  try {
    const base = REDIS_REST_URL.replace(/\/+$/, '')
    const res = await fetch(`${base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    })
    if (!res.ok) return null
    const json = await res.json()
    return Array.isArray(json) ? json : null
  } catch {
    return null
  }
}

function buildCountsKey(storeId: string): string {
  return `${SHOP_COUNTS_KEY_PREFIX}${storeId}`
}

async function getCountsFromRedis(storeIds: string[]): Promise<Map<string, ShopCounts>> {
  const out = new Map<string, ShopCounts>()
  const ids = (storeIds || []).map(String).filter(Boolean)
  if (ids.length === 0) return out
  const commands = ids.map((id) => ['GET', buildCountsKey(id)])
  const resp = await redisPipeline(commands)
  if (!resp) return out
  for (let i = 0; i < ids.length; i++) {
    const item = resp[i]
    const raw = item?.result
    if (!raw) continue
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      out.set(ids[i], normalizeCounts(parsed))
    } catch {
      continue
    }
  }
  return out
}

async function setCountsToRedis(rows: Array<{ storeId: string; counts: ShopCounts }>): Promise<void> {
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) return
  const items = (rows || [])
    .map((r) => ({ storeId: String(r.storeId || '').trim(), counts: normalizeCounts(r.counts) }))
    .filter((r) => r.storeId.length > 0)
  if (items.length === 0) return

  const now = Date.now()
  const commands = items.map((r) => [
    'SET',
    buildCountsKey(r.storeId),
    JSON.stringify({ ...r.counts, ts: now }),
    'EX',
    SHOP_COUNTS_TTL_SECONDS,
  ])
  await redisPipeline(commands)
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

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Проверка аутентификации пользователя
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      console.log('User authentication failed', {
        error: userError?.message,
      })
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated successfully', {
      userId: user.id,
    })

    // Парсинг body
    let body: RequestBody = {}
    try {
      body = await req.json()
    } catch {
      // Если body пустой или невалидный, используем дефолтные значения
    }

    const { limitOnly = false, store_id: storeId, includeConfig, forceCounts = false } = body

    if (limitOnly) {
      const { count, error: countError } = await supabaseClient
        .from('user_stores')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (countError) {
        console.log('Count error', { error: countError.message })
        return jsonResponse({ error: 'Failed to count shops' }, { status: 500 })
      }

      let limit = 0
      if (SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

          const { data: subscriptions, error: subscriptionError } =
            await adminClient
              .from('user_subscriptions')
              .select('tariff_id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .order('start_date', { ascending: false })
              .limit(1)

          if (!subscriptionError && subscriptions?.[0]?.tariff_id) {
            const tariffId = subscriptions[0].tariff_id

            const { data: limitData, error: limitError } = await adminClient
              .from('tariff_limits')
              .select('value')
              .eq('tariff_id', tariffId)
              .ilike('limit_name', '%магазин%')
              .eq('is_active', true)
              .maybeSingle()

            if (!limitError) {
              limit = Number(limitData?.value ?? 0) || 0
            }
          }
        } catch {
          limit = 0
        }
      }

      return jsonResponse({
        totalShops: count ?? 0,
        limit,
      })
    }

    const finalIncludeConfig = includeConfig === true || !!storeId

    const baseSelect = finalIncludeConfig
      ? 'id, user_id, store_name, store_company, store_url, template_id, xml_config, custom_mapping, is_active, created_at, updated_at'
      : 'id, user_id, store_name, store_company, store_url, template_id, is_active, created_at, updated_at'

    // Получение магазинов с фильтрацией по user_id
    let storesQuery = supabaseClient
      .from('user_stores')
      .select(baseSelect)
      .eq('user_id', user.id) // КРИТИЧНО: фильтр по пользователю
      .eq('is_active', true)
      .order('store_name', { ascending: true })

    if (storeId) {
      storesQuery = storesQuery.eq('id', storeId)
    }

    const { data: stores, error: storesError } = await storesQuery

    if (storesError) {
      console.log('Stores fetch error', { error: storesError.message })
      return jsonResponse({ error: 'Failed to fetch shops' }, { status: 500 })
    }

    if (!stores || stores.length === 0) {
      return jsonResponse({ shops: [] })
    }

    const storeIds = stores.map((s: any) => s.id)
    const templateIds = Array.from(
      new Set(
        stores
          .map((s: any) => s.template_id)
          .filter((id): id is string => !!id)
      )
    )

    const [{ data: templates }, cachedCounts] = await Promise.all([
      templateIds.length > 0
        ? supabaseClient
            .from('store_templates')
            .select('id, marketplace')
            .in('id', templateIds)
        : Promise.resolve({ data: [] }),
      forceCounts ? Promise.resolve(new Map<string, ShopCounts>()) : getCountsFromRedis(storeIds.map(String)),
    ])

    const templatesMap = new Map<string, string>()
    for (const template of templates || []) {
      if ((template as any).id) {
        templatesMap.set(
          String((template as any).id),
          (template as any).marketplace || 'Не вказано'
        )
      }
    }

    const countsByStore = cachedCounts || new Map<string, ShopCounts>()
    const missingStoreIds = storeIds
      .map((id: any) => String(id))
      .filter((id) => id.length > 0 && !countsByStore.has(id))

    if (missingStoreIds.length > 0) {
      const { data: links } = await supabaseClient
        .from('store_product_links')
        .select(
          'store_id, is_active, product_id, custom_category_id, store_products!inner(category_id,category_external_id)'
        )
        .in('store_id', missingStoreIds)
        .eq('is_active', true)

      const productsCountByStore = new Map<string, number>()
      const categoriesSets = new Map<string, Set<string>>()

      for (const link of links || []) {
        const sid = (link as any)?.store_id
        if (!sid) continue
        const keyStore = String(sid)
        productsCountByStore.set(keyStore, (productsCountByStore.get(keyStore) || 0) + 1)

        const base = (link as any)?.store_products || {}
        const customCat = (link as any)?.custom_category_id
        const catKey =
          customCat != null
            ? `ext:${String(customCat)}`
            : base?.category_id != null
            ? `cat:${String(base.category_id)}`
            : base?.category_external_id != null
            ? `ext:${String(base.category_external_id)}`
            : null

        if (catKey) {
          if (!categoriesSets.has(keyStore)) categoriesSets.set(keyStore, new Set<string>())
          categoriesSets.get(keyStore)!.add(catKey)
        }
      }

      const toWrite: Array<{ storeId: string; counts: ShopCounts }> = []
      for (const sid of missingStoreIds) {
        const products = productsCountByStore.get(sid) ?? 0
        const catsRaw = categoriesSets.get(sid)?.size ?? 0
        const counts = normalizeCounts({ productsCount: products, categoriesCount: catsRaw })
        countsByStore.set(sid, counts)
        toWrite.push({ storeId: sid, counts })
      }
      await setCountsToRedis(toWrite)
    }

    const aggregated = stores.map((store: any) => {
      const pid = String(store.id)
      const counts = countsByStore.get(pid) || { productsCount: 0, categoriesCount: 0 }
      return {
        ...store,
        marketplace: store.template_id
          ? templatesMap.get(String(store.template_id)) ?? 'Не вказано'
          : 'Не вказано',
        productsCount: counts.productsCount,
        categoriesCount: counts.categoriesCount,
      }
    })

    console.log('Shops fetched successfully', { count: aggregated.length })

    return jsonResponse({ shops: aggregated })

  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
