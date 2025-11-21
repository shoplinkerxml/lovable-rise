import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

type Supplier = {
  id: number
  user_id: string
  supplier_name: string
  website_url: string | null
  xml_feed_url: string | null
  phone: string | null
  created_at: string | null
  updated_at: string | null
  address?: string | null
  is_active?: boolean | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: authHeader ? { Authorization: `Bearer ${token}` } : {} } }
    )

    const { data, error } = await supabase
      .from('user_suppliers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return new Response(JSON.stringify({ error: 'suppliers_fetch_failed' }), { status: 500, headers: corsHeaders })

    const rows = (data || []) as Supplier[]
    return new Response(JSON.stringify({ suppliers: rows }), { status: 200, headers: corsHeaders })
  } catch (e) {
    const msg = (e as any)?.message || 'aggregation_failed'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})