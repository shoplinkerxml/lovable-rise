import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration')
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Link = {
  product_id: string
  store_id: string
  is_active?: boolean
  custom_price?: number | null
  custom_price_old?: number | null
  custom_price_promo?: number | null
  custom_stock_quantity?: number | null
  custom_available?: boolean | null
}

type RequestBody = { links?: Link[] }

// Вынесли нормализацию в отдельную функцию
function normalizeLinks(rawLinks: Link[]): Link[] {
  return rawLinks
    .map((l) => ({
      product_id: String(l.product_id || '').trim(),
      store_id: String(l.store_id || '').trim(),
      is_active: l.is_active !== false,
      custom_price: l.custom_price ?? null,
      custom_price_old: l.custom_price_old ?? null,
      custom_price_promo: l.custom_price_promo ?? null,
      custom_stock_quantity: l.custom_stock_quantity ?? null,
      custom_available: l.custom_available ?? true,
    }))
    .filter((l) => l.product_id && l.store_id)
}

// Отдельная функция для фильтрации существующих
async function filterExistingLinks(supabase: any, links: Link[]) {
  const productIds = [...new Set(links.map((l) => l.product_id))]
  const storeIds = [...new Set(links.map((l) => l.store_id))]

  const { data: existing, error } = await supabase
    .from('store_product_links')
    .select('product_id,store_id')
    .in('product_id', productIds)
    .in('store_id', storeIds)

  if (error) throw error

  const existingSet = new Set(
    (existing || []).map((r: any) => `${r.product_id}__${r.store_id}`)
  )

  return links.filter((l) => !existingSet.has(`${l.product_id}__${l.store_id}`))
}

// Синхронизация категорий вынесена отдельно
async function syncStoreCategories(supabase: any, insertedLinks: Link[]) {
  const productIds = [...new Set(insertedLinks.map((l) => l.product_id))]
  const storeIds = [...new Set(insertedLinks.map((l) => l.store_id))]

  // Получаем информацию о продуктах
  const { data: products, error: prodError } = await supabase
    .from('store_products')
    .select('id,category_id,supplier_id,category_external_id')
    .in('id', productIds)

  if (prodError) throw prodError

  const supplierIds = [...new Set(products?.map((p: any) => p.supplier_id).filter(Boolean))]
  const externalIds = [...new Set(products?.map((p: any) => p.category_external_id).filter(Boolean))]

  if (!supplierIds.length || !externalIds.length) return

  // Получаем категории одним запросом
  const { data: categories, error: catError } = await supabase
    .from('store_categories')
    .select('id,supplier_id,external_id')
    .in('supplier_id', supplierIds)
    .in('external_id', externalIds)

  if (catError) throw catError

  // Строим индексы
  const categoryByKey = new Map<string, number>()
  const externalIdByCategory = new Map<number, string | null>()

  categories?.forEach((cat: any) => {
    const key = `${cat.supplier_id}::${cat.external_id}`
    categoryByKey.set(key, cat.id)
    externalIdByCategory.set(cat.id, cat.external_id || null)
  })

  // Определяем category_id для каждого продукта
  const productCategoryMap = new Map<string, number>()
  products?.forEach((prod: any) => {
    if (prod.category_id) {
      productCategoryMap.set(prod.id, prod.category_id)
    } else if (prod.supplier_id && prod.category_external_id) {
      const key = `${prod.supplier_id}::${prod.category_external_id}`
      const catId = categoryByKey.get(key)
      if (catId) productCategoryMap.set(prod.id, catId)
    }
  })

  // Формируем пары store-category для проверки
  const requiredPairs = new Map<string, number>()
  insertedLinks.forEach((link) => {
    const catId = productCategoryMap.get(link.product_id)
    if (catId) {
      requiredPairs.set(`${link.store_id}__${catId}`, catId)
    }
  })

  if (!requiredPairs.size) return

  const categoryIds = [...new Set(requiredPairs.values())]

  // Проверяем существующие связи
  const { data: existingLinks, error: linkError } = await supabase
    .from('store_store_categories')
    .select('store_id,category_id')
    .in('store_id', storeIds)
    .in('category_id', categoryIds)

  if (linkError) throw linkError

  const existingSet = new Set(
    existingLinks?.map((l: any) => `${l.store_id}__${l.category_id}`) || []
  )

  // Формируем недостающие записи
  const missingLinks = Array.from(requiredPairs.entries())
    .filter(([key]) => !existingSet.has(key))
    .map(([key, catId]) => {
      const [storeId] = key.split('__')
      return {
        store_id: storeId,
        category_id: catId,
        is_active: true,
        external_id: externalIdByCategory.get(catId) ?? null,
      }
    })

  if (missingLinks.length) {
    const { error: insertError } = await supabase
      .from('store_store_categories')
      .insert(missingLinks)
    
    if (insertError) throw insertError
  }
}

// Собираем имена категорий по магазинам (как в store-category-filter-options)
async function aggregateCategoryNames(supabase: any, storeIds: string[]): Promise<Record<string, string[]>> {
  if (!Array.isArray(storeIds) || storeIds.length === 0) return {};
  const sids = Array.from(new Set(storeIds.map(String).filter(Boolean)));
  const [{ data: links }, { data: maps }] = await Promise.all([
    (supabase as any)
      .from('store_product_links')
      .select('is_active,custom_category_id,store_id,store_products(category_id,category_external_id)')
      .in('store_id', sids),
    (supabase as any)
      .from('store_store_categories')
      .select('store_id,category_id,external_id,is_active')
      .in('store_id', sids),
  ]);

  const byStoreCatId: Record<string, Record<string, string | null>> = {};
  for (const m of maps || []) {
    const active = (m as any)?.is_active !== false;
    if (!active) continue;
    const sid = String((m as any)?.store_id || '');
    const cid = (m as any)?.category_id != null ? String((m as any).category_id) : null;
    const ext = (m as any)?.external_id != null ? String((m as any).external_id) : null;
    if (!sid || !cid) continue;
    if (!byStoreCatId[sid]) byStoreCatId[sid] = {};
    byStoreCatId[sid][cid] = ext || null;
  }

  const idsByStore: Record<string, Set<string>> = {};
  const extsByStore: Record<string, Set<string>> = {};
  for (const r of links || []) {
    const active = (r as any)?.is_active !== false;
    if (!active) continue;
    const sid = String((r as any)?.store_id || '');
    if (!sid) continue;

    const linkExt = (r as any)?.custom_category_id != null ? String((r as any).custom_category_id) : null;
    const baseCid = (r as any)?.store_products?.category_id != null ? String((r as any).store_products.category_id) : null;
    const baseExt = (r as any)?.store_products?.category_external_id != null ? String((r as any).store_products.category_external_id) : null;

    if (!idsByStore[sid]) idsByStore[sid] = new Set<string>();
    if (!extsByStore[sid]) extsByStore[sid] = new Set<string>();

    if (linkExt) {
      extsByStore[sid].add(linkExt);
    } else if (baseCid && byStoreCatId[sid] && byStoreCatId[sid][baseCid]) {
      extsByStore[sid].add(String(byStoreCatId[sid][baseCid]));
    } else if (baseExt) {
      extsByStore[sid].add(baseExt);
    } else if (baseCid) {
      idsByStore[sid].add(baseCid);
    }
  }

  const allIdSet = new Set<string>();
  const allExtSet = new Set<string>();
  for (const sid of sids) {
    const ids = Array.from(idsByStore[sid] || []);
    const exts = Array.from(extsByStore[sid] || []);
    for (const v of ids) allIdSet.add(v);
    for (const v of exts) allExtSet.add(v);
  }
  const idListAll = Array.from(allIdSet);
  const extListAll = Array.from(allExtSet);

  const [catByIdRes, catByExtRes] = await Promise.all([
    idListAll.length
      ? (supabase as any).from('store_categories').select('id,name').in('id', idListAll)
      : Promise.resolve({ data: [] }),
    extListAll.length
      ? (supabase as any).from('store_categories').select('external_id,name').in('external_id', extListAll)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map<string, string>();
  const nameByExt = new Map<string, string>();
  for (const r of ((catByIdRes as any)?.data || [])) {
    const id = String((r as any)?.id || '');
    const nm = (r as any)?.name;
    if (id && nm) nameById.set(id, String(nm));
  }
  for (const r of ((catByExtRes as any)?.data || [])) {
    const ext = String((r as any)?.external_id || '');
    const nm = (r as any)?.name;
    if (ext && nm) nameByExt.set(ext, String(nm));
  }

  const results: Record<string, string[]> = {};
  for (const sid of sids) {
    const namesSet = new Set<string>();
    const ids = Array.from(idsByStore[sid] || []);
    const exts = Array.from(extsByStore[sid] || []);
    for (const id of ids) {
      const nm = nameById.get(id);
      if (nm) namesSet.add(nm);
    }
    for (const ext of exts) {
      const nm = nameByExt.get(ext);
      if (nm) namesSet.add(nm);
    }
    results[sid] = Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }

  return results;
}

Deno.serve(async (req) => {
  // Обработка CORS
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
    // Инициализация Supabase клиента
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    })

    // Парсинг и валидация входных данных
    const body: RequestBody = await req.json().catch(() => ({}))
    const rawLinks = Array.isArray(body.links) ? body.links : []
    
    if (!rawLinks.length) {
      return new Response(
        JSON.stringify({ inserted: 0 }),
        { status: 200, headers: CORS_HEADERS }
      )
    }

    const links = normalizeLinks(rawLinks)
    
    if (!links.length) {
      return new Response(
        JSON.stringify({ inserted: 0 }),
        { status: 200, headers: CORS_HEADERS }
      )
    }

    // Фильтруем уже существующие
    const toInsert = await filterExistingLinks(supabase, links)

    if (!toInsert.length) {
      return new Response(
        JSON.stringify({ inserted: 0 }),
        { status: 200, headers: CORS_HEADERS }
      )
    }

    // Вставка новых записей
    const { error: insertError } = await supabase
      .from('store_product_links')
      .insert(toInsert)

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'insert_failed', details: insertError.message }),
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Синхронизация категорий (не критично для успеха операции)
    try {
      await syncStoreCategories(supabase, toInsert)
    } catch (syncError) {
      console.error('Category sync error:', syncError)
      // Не прерываем выполнение - основная операция успешна
    }

    // Подсчет по магазинам
    const addedByStore = toInsert.reduce((acc, link) => {
      acc[link.store_id] = (acc[link.store_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Собираем имена категорий по задействованным магазинам, чтобы фронт не делал второй запрос
    let categoryNamesByStore: Record<string, string[]> = {}
    try {
      const storeIds = [...new Set(toInsert.map((l) => l.store_id))]
      categoryNamesByStore = await aggregateCategoryNames(supabase, storeIds)
    } catch (e) {
      // Не критично, просто не вернём список
      categoryNamesByStore = {}
    }

    return new Response(
      JSON.stringify({ inserted: toInsert.length, addedByStore, categoryNamesByStore }),
      { status: 200, headers: CORS_HEADERS }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'bulk_insert_failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
