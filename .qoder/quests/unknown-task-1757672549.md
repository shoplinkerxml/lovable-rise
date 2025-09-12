# Исправление фильтрации пользователей по роли в админ-панели

## Обзор

 документ описывает проблему с фильтрацией пользователей в админ-панели, где вместо отображения только пользователей с ролью "user" по умолчанию отображаются все пользователи независимо от их роли. Документ также содержит решение для исправления этой проблемы.

## Архитектура

### Проблема
В текущей реализации, несмотря на то что в компоненте `AdminUsersPage` установлено значение по умолчанию `role: "userЭтот"` для фильтров, фильтрация не применяется корректно на стороне сервера. Это происходит потому, что параметры фильтрации передаются в Supabase Edge Function, но не все параметры корректно обрабатываются.

### Текущий поток данных
1. Компонент `AdminUsersPage` инициализирует фильтры с `role: "user"` по умолчанию
2. Хук `useUsers` получает фильтры и передает их в `UserService.getUsers`
3. `UserService.getUsers` формирует URL-параметры и вызывает Supabase функцию `users`
4. Supabase функция `users` должна применить фильтр по роли, но этого не происходит

### Компоненты системы
- `AdminUsersPage.tsx` - главная страница управления пользователями
- `useUsers.ts` - React Query хук для получения данных пользователей
- `user-service.ts` - сервисный слой для взаимодействия с API
- `supabase/functions/users/index.ts` - Supabase Edge Function для управления пользователями

## Реализация исправления

### 1. Исправление в user-service.ts

Необходимо убедиться, что параметры фильтрации корректно передаются в Supabase функцию:

```typescript
// В функции getUsers
static async getUsers(
  filters: UserFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<UsersResponse> {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    // Add filters
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status);
    // Убедимся, что фильтр по роли всегда передается, даже если он равен "user"
    if (filters.role) queryParams.append('role', filters.role);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
    
    // Add pagination
    queryParams.append('page', pagination.page.toString());
    queryParams.append('limit', pagination.limit.toString());
    
    // Convert query parameters to query string
    const queryString = queryParams.toString();
    const url = queryString ? `?${queryString}` : '';

    const response = await supabase.functions.invoke("users" + url, {
      method: "GET",
      headers: await getAuthHeaders()
    });

    if (response.error) {
      throw new Error(response.error.message || "Failed to fetch users");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fetch users");
  }
}
```

### 2. Исправление в Supabase Edge Function

В файле `supabase/functions/users/index.ts` необходимо убедиться, что фильтр по роли применяется корректно:

```typescript
// В обработчике GET /users
// Apply role filter - всегда применяем фильтр по роли, если он передан
const role = searchParams.get('role');
if (role && role !== 'all') {
  query = query.eq('role', role);
}

// То же самое для запроса подсчета
let countQueryWithFilters = countQuery;
if (role && role !== 'all') {
  countQueryWithFilters = countQueryWithFilters.eq('role', role);
}
```

### 3. Проверка логики фильтрации

Убедимся, что логика фильтрации в Supabase Edge Function работает корректно:

```typescript
// В обработчике GET /users
if (req.method === 'GET' && !userId) {
  const url = new URL(req.url)
  const searchParams = url.searchParams
  
  let query = supabaseClient
    .from('profiles')
    .select('*')
  
  // Apply role filter - always apply role filter if provided
  const role = searchParams.get('role');
  console.log('Received role parameter:', role); // Debug log
  if (role && role !== 'all') {
    query = query.eq('role', role);
    console.log('Applied role filter:', role); // Debug log
  }
  
  // Apply search filter
  const search = searchParams.get('search')
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  
  // Apply status filter
  const status = searchParams.get('status')
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  
  // Apply sorting
  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })
  
  // Debugging logs
  console.log('Received parameters:', { role, search, status, sortBy, sortOrder });
  
  // Get total count before pagination
  const countQuery = supabaseClient
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  // Apply the same filters to count query
  let countQueryWithFilters = countQuery;
  if (role && role !== 'all') {
    countQueryWithFilters = countQueryWithFilters.eq('role', role);
    console.log('Applied role filter to count query:', role);
  }
  if (search) {
    countQueryWithFilters = countQueryWithFilters.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    console.log('Applied search filter to count query:', search);
  }
  if (status && status !== 'all') {
    countQueryWithFilters = countQueryWithFilters.eq('status', status)
    console.log('Applied status filter to count query:', status);
  }
  
  // Execute count query properly
  const countResult = await countQueryWithFilters;
  const totalCount = countResult.count;
  const countError = countResult.error;
  
  if (countError) {
    console.log('Users count error:', countError)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users count' }),
      { 
        status: 500, 
        headers: { ...corsHeaders }
      }
    )
  }
  
  console.log('Total count result:', totalCount);
  
  // Apply pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)
  
  const { data: users, error } = await query

  if (error) {
    console.log('Users fetch error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users' }),
      { 
        status: 500, 
        headers: { ...corsHeaders }
      }
    )
  }

  return new Response(
    JSON.stringify({ 
      users,
      total: totalCount || 0,
      page,
      limit
    }),
    { 
      headers: { ...corsHeaders }
    }
  )
}
```

## Тестирование

### План тестирования
1. Проверить, что по умолчанию отображаются только пользователи с ролью "user"
2. Проверить, что фильтр по другим ролям работает корректно
3. Проверить, что фильтр "all" отображает всех пользователей
4. Проверить, что комбинированные фильтры работают корректно

### Сценарии тестирования
1. Открыть страницу `/admin/users` и убедиться, что отображаются только пользователи с ролью "user"
2. Выбрать роль "admin" в фильтре и убедиться, что отображаются только администраторы
3. Выбрать роль "all" и убедиться, что отображаются все пользователи
4. Проверить комбинацию фильтров (роль + статус + поиск)

## Заключение

После реализации вышеуказанных изменений фильтрация пользователей в админ-панели будет работать корректно, и по умолчанию будут отображаться только пользователи с ролью "user", как и ожидалось.