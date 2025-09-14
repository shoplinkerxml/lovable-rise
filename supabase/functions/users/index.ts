import { createClient } from '@supabase/supabase-js'

// Заголовки CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, X-Client-Info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

// Проверка админа для POST/PATCH/DELETE
async function checkAdminPermission(serviceClient, authHeader) {
  if (!authHeader) {
    return { error: 'Unauthorized - no token', status: 401 };
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_ANON_KEY'),
    {
      global: {
        headers: { Authorization: authHeader }
      }
    }
  );

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) return { error: 'Failed to fetch profile', status: 500 };
  if (!profile || profile.role !== 'admin') return { error: 'Forbidden - Admin access required', status: 403 };

  return { user, profile };
}

// Основная функция
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const userId = pathParts.length > 1 ? pathParts[1] : null;

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ---------------- GET /users ----------------
    if (req.method === 'GET' && !userId) {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const offset = (page - 1) * limit;
      const sortBy = url.searchParams.get('sortBy') || 'created_at';
      const sortOrder = url.searchParams.get('sortOrder') || 'desc';
      const search = url.searchParams.get('search');
      const roleParam = url.searchParams.get('role');

      let query = anonClient.from('profiles').select('*', { count: 'exact' });
      if (roleParam && roleParam !== 'all') query = query.eq('role', roleParam);
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + limit - 1);

      const { data: users, error, count } = await query;
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

      return new Response(JSON.stringify({ users: users || [], total: count ?? 0, page, limit }), { headers: corsHeaders });
    }

    // ---------------- GET /users/:id ----------------
    if (req.method === 'GET' && userId) {
      const { data: user, error } = await anonClient.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify({ user }), { headers: corsHeaders });
    }

    // ---------------- POST/PATCH/DELETE требуют админа ----------------
    const adminCheck = await checkAdminPermission(serviceClient, authHeader);
    if ('error' in adminCheck) return new Response(JSON.stringify({ error: adminCheck.error }), { status: adminCheck.status, headers: corsHeaders });

    // ---------------- POST /users ----------------
    if (req.method === 'POST') {
      const { email, password, name, phone, role = 'user' } = await req.json();
      if (!email || !password || !name) return new Response(JSON.stringify({ error: 'Email, password, name required' }), { status: 400, headers: corsHeaders });

      const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
      if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders });

      const { data: profile, error: profileError } = await serviceClient.from('profiles').upsert({ id: authData.user.id, email, name, phone: phone || null, role, status: 'active' }).select().maybeSingle();
      if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: corsHeaders });

      return new Response(JSON.stringify({ user: profile }), { status: 201, headers: corsHeaders });
    }

    // ---------------- PATCH /users/:id ----------------
    if (req.method === 'PATCH' && userId) {
      const contentType = req.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), { status: 400, headers: corsHeaders });

      let body: any;
      try { body = await req.json(); } 
      catch { return new Response(JSON.stringify({ error: 'Request body must be valid JSON' }), { status: 400, headers: corsHeaders }); }

      if (!body || Object.keys(body).length === 0) return new Response(JSON.stringify({ error: 'No fields provided for update' }), { status: 400, headers: corsHeaders });

      const { name, phone, role, status } = body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) updateData.status = status;

      const { data: user, error } = await serviceClient.from('profiles').update(updateData).eq('id', userId).select().maybeSingle();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });

      return new Response(JSON.stringify({ user }), { headers: corsHeaders });
    }

    // ---------------- DELETE /users/:id ----------------
    if (req.method === 'DELETE' && userId) {
      const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
      if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 500, headers: corsHeaders });

      const { data: user, error: profileError } = await serviceClient.from('profiles').delete().eq('id', userId).select().maybeSingle();
      if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: corsHeaders });

      return new Response(JSON.stringify({ user }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
