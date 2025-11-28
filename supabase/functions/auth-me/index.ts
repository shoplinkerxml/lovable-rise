import { createClient } from '@supabase/supabase-js'
import type { Database } from '../_shared/database-types.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

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
      email: user.email,
    })

    const [
      { data: profile, error: profileError },
      { data: subscription, error: subscriptionError },
      { data: menuItems, error: menuItemsError },
    ] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),
      supabaseClient
        .from('user_subscriptions')
        .select('*, tariffs(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseClient
        .from('user_menu_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true }),
    ])

    if (profileError) {
      console.log('Profile fetch error', { error: profileError.message })
      return jsonResponse({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile) {
      console.log('Profile not found for user', { userId: user.id })
      return jsonResponse({ error: 'Profile not found' }, { status: 404 })
    }

    if (subscriptionError) {
      console.log('Subscription fetch error', {
        error: subscriptionError.message,
      })
    }

    if (menuItemsError) {
      console.log('Menu items fetch error', {
        error: menuItemsError.message,
      })
    }

    const tariffId =
      (subscription as any)?.tariffs?.id ?? (subscription as any)?.tariff_id

    let tariffLimits: Array<{ limit_name: string; value: number }> = []

    if (tariffId) {
      const { data: limits, error: limitsError } = await supabaseClient
        .from('tariff_limits')
        .select('limit_name, value')
        .eq('tariff_id', tariffId)
        .eq('is_active', true)

      if (limitsError) {
        console.log('Tariff limits fetch error', {
          error: limitsError.message,
        })
      } else if (limits) {
        tariffLimits = limits.map((l: any) => ({
          limit_name: String(l.limit_name),
          value: Number(l.value),
        }))
      }
    }

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          ...(profile && typeof profile === 'object' ? profile : {})
        },
        subscription,
        tariffLimits,
        menuItems: menuItems || []
      }),
      { 
        headers: { ...corsHeaders }
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonResponse({ error: 'Internal server error' }, { status: 500 })
  }
})