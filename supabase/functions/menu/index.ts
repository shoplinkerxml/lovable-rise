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
          role: 'admin' | 'manager'
        }
      }
      menu_items: {
        Row: {
          id: number
          title: string
          path: string
          parent_id: number | null
          order_index: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          title: string
          path: string
          parent_id?: number | null
          order_index?: number
          is_active?: boolean
        }
        Update: {
          title?: string
          path?: string
          parent_id?: number | null
          order_index?: number
          is_active?: boolean
        }
      }
      user_permissions: {
        Row: {
          id: number
          user_id: string
          menu_item_id: number
          can_view: boolean
          can_edit: boolean
        }
      }
    }
  }
}

async function getUserWithPermissions(supabaseClient: any) {
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return { error: 'Profile not found', status: 404 }
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

    const userCheck = await getUserWithPermissions(supabaseClient)
    if ('error' in userCheck) {
      return new Response(
        JSON.stringify({ error: userCheck.error }),
        { 
          status: userCheck.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { user, profile } = userCheck
    const url = new URL(req.url)
    const menuId = url.pathname.split('/').pop()

    // GET /menu - получить меню для текущего пользователя
    if (req.method === 'GET' && !menuId) {
      let menuQuery = supabaseClient
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index')

      // Если не админ, фильтруем по правам доступа
      if (profile.role !== 'admin') {
        const { data: permissions } = await supabaseClient
          .from('user_permissions')
          .select('menu_item_id')
          .eq('user_id', user.id)
          .eq('can_view', true)

        const allowedMenuIds = permissions?.map(p => p.menu_item_id) || []
        if (allowedMenuIds.length === 0) {
          return new Response(
            JSON.stringify({ menu: [] }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        menuQuery = menuQuery.in('id', allowedMenuIds)
      }

      const { data: menu, error } = await menuQuery

      if (error) {
        console.log('Menu fetch error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch menu' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ menu }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Только админы могут управлять меню
    if (profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // POST /menu - создать пункт меню
    if (req.method === 'POST') {
      const body = await req.json()
      const { title, path, parent_id, order_index } = body

      if (!title || !path) {
        return new Response(
          JSON.stringify({ error: 'Title and path are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const { data: menuItem, error } = await supabaseClient
        .from('menu_items')
        .insert({ title, path, parent_id, order_index })
        .select()
        .single()

      if (error) {
        console.log('Menu creation error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create menu item' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ menuItem }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // PATCH /menu/:id - обновить пункт меню
    if (req.method === 'PATCH' && menuId) {
      const body = await req.json()
      const { title, path, parent_id, order_index, is_active } = body

      const { data: menuItem, error } = await supabaseClient
        .from('menu_items')
        .update({ title, path, parent_id, order_index, is_active })
        .eq('id', menuId)
        .select()
        .single()

      if (error) {
        console.log('Menu update error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update menu item' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ menuItem }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // DELETE /menu/:id - деактивировать пункт меню
    if (req.method === 'DELETE' && menuId) {
      const { data: menuItem, error } = await supabaseClient
        .from('menu_items')
        .update({ is_active: false })
        .eq('id', menuId)
        .select()
        .single()

      if (error) {
        console.log('Menu deactivation error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate menu item' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ menuItem }),
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