import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          role: 'admin' | 'manager'
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          phone?: string | null
          role?: 'admin' | 'manager'
          status?: 'active' | 'inactive'
        }
        Update: {
          email?: string
          name?: string
          phone?: string | null
          role?: 'admin' | 'manager'
          status?: 'active' | 'inactive'
        }
      }
    }
  }
}

async function checkAdminPermission(supabaseClient: any) {
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 }
  }

  return { user, profile }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const adminCheck = await checkAdminPermission(supabaseClient)
    if ('error' in adminCheck) {
      return new Response(
        JSON.stringify({ error: adminCheck.error }),
        { 
          status: adminCheck.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(req.url)
    const userId = url.pathname.split('/').pop()

    // GET /users - список всех пользователей
    if (req.method === 'GET' && !userId) {
      const { data: users, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Users fetch error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ users }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // POST /users - создать пользователя
    if (req.method === 'POST') {
      const body = await req.json()
      const { email, password, name, phone, role = 'manager' } = body

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: 'Email, password and name are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Create user in auth
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      })

      if (authError) {
        console.log('Auth user creation error:', authError)
        return new Response(
          JSON.stringify({ error: authError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Profile will be created automatically by trigger
      // Update with additional info
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .update({ phone, role })
        .eq('id', authData.user.id)
        .select()
        .single()

      if (profileError) {
        console.log('Profile update error:', profileError)
        return new Response(
          JSON.stringify({ error: 'User created but profile update failed' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ user: profile }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // PATCH /users/:id - обновить пользователя
    if (req.method === 'PATCH' && userId) {
      const body = await req.json()
      const { name, phone, role, status } = body

      const { data: user, error } = await supabaseClient
        .from('profiles')
        .update({ name, phone, role, status })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.log('User update error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update user' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ user }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // DELETE /users/:id - деактивировать пользователя
    if (req.method === 'DELETE' && userId) {
      const { data: user, error } = await supabaseClient
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.log('User deactivation error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate user' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ user }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})