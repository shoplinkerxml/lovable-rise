# Исправление аутентификации Supabase: правильная передача токенов для RLS

## Обзор проблемы

В текущей реализации обнаружена критическая ошибка в передаче токенов аутентификации в запросах к Supabase, которая нарушает работу Row Level Security (RLS) политик. Проблема заключается в неправильном использовании anon key в заголовке `Authorization` вместо access token пользователя.

### Текущая неправильная реализация
```
apikey: <ANON_KEY> ✅ (правильно)
authorization: Bearer <ANON_KEY> ❌ (неправильно)
```

### Правильная реализация
```
apikey: <ANON_KEY> ✅ 
authorization: Bearer <USER_ACCESS_TOKEN> ✅
```

## Архитектура проблемы

```mermaid
graph TB
    A[Frontend App] --> B[Supabase Client]
    B --> C[Auth Service]
    B --> D[Database Queries]
    
    C --> E[Session Management]
    E --> F[Access Token]
    
    D --> G[RLS Policies]
    G --> H[auth.uid() check]
    
    H --> I{Token Type}
    I -->|anon key| J[❌ auth.uid() = null]
    I -->|access token| K[✅ auth.uid() = user_id]
    
    J --> L[Empty Results]
    K --> M[User Data]
    
    style J fill:#ff9999
    style L fill:#ff9999
    style K fill:#99ff99
    style M fill:#99ff99
```

## Текущая архитектура аутентификации

### Supabase Client Configuration
- **Файл**: `src/integrations/supabase/client.ts`
- **Проблема**: Клиент настроен корректно, но некоторые сервисы могут неправильно передавать токены

### Row Level Security Policies
Текущие RLS политики требуют валидного `auth.uid()`:

```sql
-- Пример из миграций
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());
```

### Функция получения роли пользователя
```sql
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
```

## Анализ компонентов с потенциальными проблемами

### 1. Profile Service
**Файл**: `src/lib/profile-service.ts`

**Проблемные области**:
- Методы создания профиля с аутентификацией
- Получение access token из сессии

**Текущая реализация**:
```typescript
private static async getCurrentAccessToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return null;
    }
    
    return session.access_token; // ✅ Правильно
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}
```

### 2. User Auth Service  
**Файл**: `src/lib/user-auth-service.ts`

**Проблемные области**:
- Извлечение session context после регистрации/входа
- Обработка access token

**Текущая реализация**:
```typescript
private static extractSessionContext(authData: any): SessionContext {
  return {
    accessToken: authData.session?.access_token || null, // ✅ Правильно
    refreshToken: authData.session?.refresh_token || null,
    userId: authData.user?.id || '',
    isReady: !!(authData.session?.access_token && authData.user?.id),
    expiresAt: authData.session?.expires_at ? authData.session.expires_at * 1000 : null
  };
}
```

### 3. Edge Functions
**Файлы**: `supabase/functions/*/index.ts`

**Текущая реализация**:
```typescript
const supabaseClient = createClient<Database>(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! }, // ✅ Правильно
    },
  }
)
```

## Проблемные сценарии использования

### 1. Создание профиля при регистрации
```typescript
// В user-auth-service.ts
const profile = await ProfileService.createProfileWithAuth({
  id: authData.user.id,
  email: data.email,
  name: data.name,
  role: 'user' as const,
  status: 'active' as const
}, sessionContext.accessToken!); // ✅ Используется access token
```

### 2. Получение текущего пользователя
```typescript
// В AdminProtected.tsx, AdminLayout.tsx
const { data } = await supabase.auth.getSession();
// Проверить: передается ли правильный токен в последующих запросах
```

## Диагностика проблем

### Шаги для проверки корректности токенов

1. **Проверка токена в браузере**:
```javascript
// В DevTools Console
const { data: { session } } = await supabase.auth.getSession();
console.log('Access Token:', session?.access_token);
console.log('User ID:', session?.user?.id);
```

2. **Проверка заголовков запросов**:
```javascript
// Мониторинг Network tab
// Поиск запросов к /rest/v1/profiles
// Проверка Authorization header
```

3. **Проверка RLS в базе данных**:
```sql
-- Выполнить в Supabase SQL Editor
SELECT auth.uid(); -- Должно возвращать user_id, а не null
```

## Исправления

### 1. Проверка правильности передачи токенов в запросах

#### В компонентах React
```typescript
// Убедиться, что используется правильный Supabase client
import { supabase } from "@/integrations/supabase/client";

const fetchUserProfile = async () => {
  // Supabase автоматически добавляет access token из текущей сессии
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId);
};
```

#### В ProfileService
```typescript
static async createProfileWithAuth(profileData: any, accessToken: string) {
  try {
    // Создание временного клиента с явным токеном
    const authenticatedClient = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            'Authorization': `Bearer ${accessToken}`, // ✅ Правильно
            'apikey': SUPABASE_PUBLISHABLE_KEY // ✅ Правильно
          }
        }
      }
    );
    
    const { data, error } = await authenticatedClient
      .from('profiles')
      .insert([profileData])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}
```

### 2. Проверка автоматического обновления токенов

```typescript
// В client.ts - убедиться в правильной конфигурации
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true, // ✅ Важно для автообновления
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});
```

### 3. Middleware для проверки токенов (опционально)

```typescript
// Утилита для проверки валидности сессии
export const ensureValidSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn('No valid session found');
      return false;
    }
    
    // Проверка истечения токена
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    
    if (expiresAt <= now) {
      console.warn('Session expired, refreshing...');
      const { error: refreshError } = await supabase.auth.refreshSession();
      return !refreshError;
    }
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};
```

## Тестирование исправлений

### 1. Модульные тесты для токенов
```typescript
describe('Token Management', () => {
  it('should extract access token from session', async () => {
    const mockSession = {
      access_token: 'valid_token',
      user: { id: 'user_id' }
    };
    
    const context = UserAuthService.extractSessionContext({
      session: mockSession,
      user: mockSession.user
    });
    
    expect(context.accessToken).toBe('valid_token');
    expect(context.isReady).toBe(true);
  });
});
```

### 2. Интеграционные тесты RLS
```typescript
describe('RLS Integration', () => {
  it('should access profile with valid token', async () => {
    // Войти в систему
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password'
    });
    
    // Проверить доступ к профилю
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    expect(error).toBeNull();
    expect(profile).toBeDefined();
    expect(profile.id).toBe(authData.user.id);
  });
});
```

## Мониторинг и отладка

### Логирование запросов
```typescript
// Добавить в ProfileService
private static logRequest(operation: string, userId: string, token?: string) {
  console.log(`[ProfileService] ${operation}`, {
    userId,
    hasToken: !!token,
    tokenPrefix: token ? `${token.substring(0, 10)}...` : 'none',
    timestamp: new Date().toISOString()
  });
}
```

### Проверка RLS политик
```sql
-- Проверить текущие политики
SELECT schemaname, tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Проверить функцию auth.uid()
SELECT auth.uid() as current_user_id;
```

## Влияние на безопасность

### Риски неправильной реализации
1. **Утечка данных**: RLS не работает → доступ к чужим данным
2. **Нарушение авторизации**: `auth.uid()` возвращает `null`
3. **Неработающие политики**: Все запросы возвращают пустые результаты

### Преимущества правильной реализации
1. **Строгая изоляция данных**: Каждый пользователь видит только свои данные
2. **Автоматическая авторизация**: RLS работает на уровне БД
3. **Безопасность по умолчанию**: Нет доступа без валидного токена

## Заключение

Исправление передачи токенов критически важно для работы системы безопасности. Основные требования:

1. ✅ `apikey` - всегда anon key
2. ✅ `authorization` - access token пользователя из сессии
3. ✅ Автоматическое обновление токенов
4. ✅ Проверка валидности сессии
5. ✅ Правильная обработка ошибок авторизации

Все компоненты должны использовать правильно настроенный Supabase client, который автоматически передает access token из текущей сессии в заголовке Authorization.