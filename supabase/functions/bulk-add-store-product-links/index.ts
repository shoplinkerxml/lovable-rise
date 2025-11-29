import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase configuration')
}

const corsHeaders = {
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

type Body = { links?: Link[] }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : authHeader

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: authHeader
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {},
    })

    const body: Body = (await req.json().catch(() => ({} as Body))) as Body

    const rawLinks: Link[] = Array.isArray(body.links) ? body.links : []
    const links = rawLinks
      .map((l) => ({
        product_id: String(l.product_id || '').trim(),
        store_id: String(l.store_id || '').trim(),
        is_active: l.is_active !== false,
        custom_price: l.custom_price ?? null,
        custom_price_old: l.custom_price_old ?? null,
        custom_price_promo: l.custom_price_promo ?? null,
        custom_stock_quantity: l.custom_stock_quantity ?? null,
        custom_available:
          l.custom_available === null || l.custom_available === undefined
            ? true
            : l.custom_available,
      }))
      .filter((l) => l.product_id && l.store_id)

    if (links.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    const productIds = Array.from(new Set(links.map((l) => l.product_id)))
    const storeIds = Array.from(new Set(links.map((l) => l.store_id)))

    const { data: existing } = await supabase
      .from('store_product_links')
      .select('product_id,store_id')
      .in('product_id', productIds)
      .in('store_id', storeIds)

    const existingSet = new Set(
      (existing || []).map(
        (r: any) => `${String(r.product_id)}__${String(r.store_id)}`,
      ),
    )

    const toInsert = links.filter(
      (l) => !existingSet.has(`${l.product_id}__${l.store_id}`),
    )

    if (toInsert.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        status: 200,
        headers: corsHeaders,
      })
    }

    const { error: insErr } = await supabase
      .from('store_product_links')
      .insert(toInsert)
      .select('*')

    if (insErr) {
      return new Response(JSON.stringify({ error: 'insert_failed' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    try {
      const prodIdsUnique = Array.from(
        new Set(toInsert.map((l) => l.product_id)),
      )
      const storeIdsUnique = Array.from(
        new Set(toInsert.map((l) => l.store_id)),
      )

      const { data: prodRows } = await supabase
        .from('store_products')
        .select('id,category_id,supplier_id,category_external_id')
        .in('id', prodIdsUnique)

      const supplierIds = Array.from(
        new Set(
          (prodRows || [])
            .map((r: any) => r?.supplier_id)
            .filter((v) => v != null),
        ),
      )

      const externalIds = Array.from(
        new Set(
          (prodRows || [])
            .map((r: any) => r?.category_external_id)
            .filter((v) => !!v),
        ),
      )

      const catByExt: Record<string, number> = {}
      const extById: Record<number, string | null> = {}

      if (supplierIds.length > 0 && externalIds.length > 0) {
        const { data: catRows } = await supabase
          .from('store_categories')
          .select('id,supplier_id,external_id')
          .in('supplier_id', supplierIds as any)
          .in('external_id', externalIds as any)

        for (const r of catRows || []) {
          const id = Number((r as any).id)
          const sup = (r as any).supplier_id
          const ext = (r as any).external_id
          const key =
            sup != null && ext != null
              ? `${String(sup)}::${String(ext)}`
              : null

          if (key) {
            catByExt[key] = id
          }
          extById[id] =
            ext != null && String(ext).trim() !== ''
              ? String(ext)
              : null
        }
      }

      const catIdByProduct: Record<string, number | null> = {}
      for (const r of prodRows || []) {
        const pid = String((r as any).id)
        const cidRaw = (r as any)?.category_id
        const cid =
          cidRaw != null && Number.isFinite(Number(cidRaw))
            ? Number(cidRaw)
            : null

        if (cid != null) {
          catIdByProduct[pid] = cid
          continue
        }

        const sup = (r as any)?.supplier_id
        const ext = (r as any)?.category_external_id
        const key =
          sup != null && ext
            ? `${String(sup)}::${String(ext)}`
            : null

        catIdByProduct[pid] =
          key && catByExt[key] ? Number(catByExt[key]) : null
      }

      const targetPairs = new Set<string>()
      const targetCatIds = new Set<number>()

      for (const l of toInsert) {
        const cid = catIdByProduct[String(l.product_id)]
        if (cid != null && Number.isFinite(cid)) {
          targetPairs.add(`${String(l.store_id)}__${String(cid)}`)
          targetCatIds.add(Number(cid))
        }
      }

      if (targetPairs.size > 0) {
        const { data: existingCats } = await supabase
          .from('store_store_categories')
          .select('store_id,category_id')
          .in('store_id', storeIdsUnique)
          .in('category_id', Array.from(targetCatIds))

        const existingCatPairs = new Set(
          (existingCats || []).map(
            (r: any) =>
              `${String((r as any).store_id)}__${String(
                (r as any).category_id,
              )}`,
          ),
        )

        const missingPairs: Array<{
          store_id: string
          category_id: number
        }> = []

        for (const pair of Array.from(targetPairs)) {
          if (!existingCatPairs.has(pair)) {
            const [sid, cidStr] = pair.split('__')
            const cidNum = Number(cidStr)
            if (sid && Number.isFinite(cidNum)) {
              missingPairs.push({
                store_id: sid,
                category_id: cidNum,
              })
            }
          }
        }

        if (missingPairs.length > 0) {
          const allCatIds = Array.from(
            new Set(missingPairs.map((p) => p.category_id)),
          )

          const missingCatIds = allCatIds.filter(
            (id) => !(id in extById),
          )

          if (missingCatIds.length > 0) {
            const { data: catsInfo } = await supabase
              .from('store_categories')
              .select('id,external_id')
              .in('id', missingCatIds)

            for (const r of catsInfo || []) {
              const id = Number((r as any).id)
              const ext = (r as any)?.external_id
              extById[id] =
                ext != null && String(ext).trim() !== ''
                  ? String(ext)
                  : null
            }
          }

          const rows = missingPairs.map((p) => ({
            store_id: p.store_id,
            category_id: p.category_id,
            is_active: true,
            external_id: extById[p.category_id] ?? null,
          }))

          if (rows.length > 0) {
            await supabase
              .from('store_store_categories')
              .insert(rows)
          }
        }
      }
    } catch {
      // Игнорируем ошибки дополнительной синхронизации категорий
    }

    const addedByStore: Record<string, number> = {}
    for (const l of toInsert) {
      addedByStore[l.store_id] = (addedByStore[l.store_id] || 0) + 1
    }

    return new Response(
      JSON.stringify({ inserted: toInsert.length, addedByStore }),
      { status: 200, headers: corsHeaders },
    )
  } catch (e) {
    const msg = (e as any)?.message || 'bulk_insert_failed'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})