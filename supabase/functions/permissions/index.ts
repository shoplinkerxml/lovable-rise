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
      user_permissions: {
        Row: {
          id: number
          user_id: string
          menu_item_id: number
          can_view: boolean
          can_edit: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          menu_item_id: number
          can_view?: boolean
          can_edit?: boolean
        }
        Update: {
          can_view?: boolean
          can_edit?: boolean
        }
      }
      menu_items: {
        Row: {
          id: number
          title: string
          path: string
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
    const pathParts = url.pathname.split('/').filter(p => p)
    const userId = pathParts[1] // /permissions/{userId}
    const menuItemId = pathParts[2] // /permissions/{userId}/{menuItemId}

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // GET /permissions/:userId - получить доступы пользователя
    if (req.method === 'GET' && !menuItemId) {
      const { data: permissions, error } = await supabaseClient
        .from('user_permissions')
        .select(`
          *,
          menu_items:menu_item_id (
            id,
            title,
            path
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Permissions fetch error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch permissions' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ permissions }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // POST /permissions/:userId - назначить доступы пользователю
    if (req.method === 'POST' && !menuItemId) {
      const body = await req.json()
      const { permissions } = body // Array of { menu_item_id, can_view, can_edit }

      if (!Array.isArray(permissions)) {
        return new Response(
          JSON.stringify({ error: 'Permissions must be an array' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Delete existing permissions for this user
      await supabaseClient
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)

      // Insert new permissions
      const permissionsToInsert = permissions.map(p => ({
        user_id: userId,
        menu_item_id: p.menu_item_id,
        can_view: p.can_view ?? true,
        can_edit: p.can_edit ?? false
      }))

      const { data: newPermissions, error } = await supabaseClient
        .from('user_permissions')
        .insert(permissionsToInsert)
        .select()

      if (error) {
        console.log('Permissions creation error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create permissions' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ permissions: newPermissions }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // PATCH /permissions/:userId/:menuItemId - изменить конкретный доступ
    if (req.method === 'PATCH' && menuItemId) {
      const body = await req.json()
      const { can_view, can_edit } = body

      const { data: permission, error } = await supabaseClient
        .from('user_permissions')
        .update({ can_view, can_edit })
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)
        .select()
        .single()

      if (error) {
        console.log('Permission update error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update permission' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ permission }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // DELETE /permissions/:userId/:menuItemId - удалить конкретный доступ
    if (req.method === 'DELETE' && menuItemId) {
      const { error } = await supabaseClient
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('menu_item_id', menuItemId)

      if (error) {
        console.log('Permission deletion error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to delete permission' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Permission deleted successfully' }),
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