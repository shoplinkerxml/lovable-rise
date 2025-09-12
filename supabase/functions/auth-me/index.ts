import { createClient } from '@supabase/supabase-js'
import type { Database } from '../_shared/database-types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Content-Type': 'application/json'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Handle both authentication methods per Supabase recommendations
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey');

    let supabaseClient;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Authenticated user request
      supabaseClient = createClient<Database>(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );
    } else if (apiKey) {
      // Anonymous request
      supabaseClient = createClient<Database>(
        Deno.env.get('SUPABASE_URL') ?? '',
        apiKey,
        {}
      );
    } else {
      // No authentication provided
      return new Response(
        JSON.stringify({ error: 'Missing authentication' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Enhanced logging for token debugging
    console.log('Auth-me request received:', {
      hasAuthHeader: !!authHeader,
      hasApiKey: !!apiKey,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      timestamp: new Date().toISOString()
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.log('User authentication failed:', {
        error: userError,
        hasUser: !!user,
        timestamp: new Date().toISOString()
      })
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders }
        }
      )
    }
    
    console.log('User authenticated successfully:', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.log('Profile fetch error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders }
        }
      )
    }

    if (!profile) {
      console.log('Profile not found for user:', user.id)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders }
        }
      )
    }

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          ...profile
        }
      }),
      { 
        headers: { ...corsHeaders }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders }
      }
    )
  }
})