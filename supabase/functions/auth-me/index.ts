import { createClient } from '@supabase/supabase-js'

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

let demoTariffCache: any = null
let demoCacheTimestamp = 0
const DEMO_CACHE_TTL = 5 * 60 * 1000

async function getDemoTariff(supabaseClient: any) {
  if (demoTariffCache && Date.now() - demoCacheTimestamp < DEMO_CACHE_TTL) {
    return demoTariffCache
  }

  let demoTariff: any = null
  let lastError: any = null

  const {
    data: primaryDemoTariff,
    error: primaryDemoError,
  } = await supabaseClient
    .from('tariffs')
    .select('*')
    .eq('is_free', true)
    .eq('is_active', true)
    .eq('visible', false)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (primaryDemoTariff) {
    demoTariff = primaryDemoTariff
  } else if (primaryDemoError) {
    lastError = primaryDemoError
  }

  if (!demoTariff) {
    const {
      data: fallbackDemoTariff,
      error: fallbackDemoError,
    } = await supabaseClient
      .from('tariffs')
      .select('*')
      .eq('is_free', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (fallbackDemoTariff) {
      demoTariff = fallbackDemoTariff
    } else if (!lastError) {
      lastError = fallbackDemoError
    }
  }

  if (!demoTariff && lastError) {
    console.error('Failed to fetch demo tariff:', lastError.message)
  }

  if (demoTariff) {
    demoTariffCache = demoTariff
    demoCacheTimestamp = Date.now()
  }

  return demoTariff
}

async function createDemoSubscription(
  supabaseClient: any,
  userId: string,
  tariff: any
) {
  const startDate = new Date()
  let endDate: string | null = null

  if (!tariff.is_lifetime && tariff.duration_days) {
    const end = new Date(startDate)
    end.setDate(end.getDate() + tariff.duration_days)
    endDate = end.toISOString()
  }

  const { data, error } = await supabaseClient
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      tariff_id: tariff.id,
      start_date: startDate.toISOString(),
      end_date: endDate,
      is_active: true,
    })
    .select('*, tariffs(*)')
    .single()

  if (error) {
    console.error('Failed to create demo subscription:', error.message)
    return null
  }

  return data
}

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

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

    let finalSubscription: any = subscription

    if (!finalSubscription) {
      const { count, error: countError } = await supabaseClient
        .from('user_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (countError) {
        console.error('Subscription count error:', countError.message)
      } else if (!count || count === 0) {
        const demoTariff = await getDemoTariff(supabaseClient)
        if (demoTariff) {
          const demoSubscription = await createDemoSubscription(
            supabaseClient,
            user.id,
            demoTariff
          )
          if (demoSubscription) {
            finalSubscription = demoSubscription
          }
        }
      }
    }

    const tariffId =
      (finalSubscription as any)?.tariffs?.id ??
      (finalSubscription as any)?.tariff_id

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
        tariffLimits = limits
      }
    }

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        ...(profile && typeof profile === 'object' ? profile : {}),
      },
      subscription: finalSubscription,
      tariffLimits,
      menuItems: menuItems || [],
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonResponse({ error: 'Internal server error' }, { status: 500 })
  }
})
