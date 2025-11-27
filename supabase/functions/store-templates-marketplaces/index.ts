import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type Body = { limit?: number | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const body: Body = await req.json().catch(() => ({}) as Body)
    const limit = (typeof body.limit === 'number' && body.limit > 0) ? body.limit : null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: authHeader ? { Authorization: `Bearer ${token}` } : {} } }
    )

    let query = (supabase as any)
      .from('store_templates')
      .select('marketplace')
      .eq('is_active', true)
      .order('marketplace', { ascending: true })
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    if (error) return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 500, headers: corsHeaders })

    const set = new Set<string>()
    for (const r of (data || [])) {
      const m = (r as any)?.marketplace
      if (m) set.add(String(m))
    }
    const items = Array.from(set)

    return new Response(JSON.stringify({ marketplaces: items }), { status: 200, headers: corsHeaders })
  } catch (e) {
    const msg = (e as any)?.message || 'marketplaces_failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})

