import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Copy, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  adminOnly?: boolean;
  requestBody?: any;
  responseBody?: any;
  parameters?: { name: string; type: string; description: string; required: boolean }[];
}

const endpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/auth-me',
    description: 'Получить информацию о текущем пользователе',
    auth: true,
    responseBody: {
      user: {
        id: 'uuid',
        email: 'string',
        name: 'string',
        phone: 'string | null',
        role: 'admin | manager',
        status: 'active | inactive',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }
    }
  },
  {
    method: 'GET',
    path: '/users',
    description: 'Получить список всех пользователей',
    auth: true,
    adminOnly: true,
    responseBody: {
      users: [{
        id: 'uuid',
        email: 'string',
        name: 'string',
        phone: 'string | null',
        role: 'admin | manager',
        status: 'active | inactive',
        created_at: 'timestamp',
        updated_at: 'timestamp'
      }]
    }
  },
  {
    method: 'POST',
    path: '/users',
    description: 'Создать нового пользователя',
    auth: true,
    adminOnly: true,
    requestBody: {
      email: 'string (required)',
      password: 'string (required)',
      name: 'string (required)',
      phone: 'string (optional)',
      role: 'admin | manager (default: manager)'
    },
    responseBody: {
      user: {
        id: 'uuid',
        email: 'string',
        name: 'string',
        phone: 'string | null',
        role: 'admin | manager',
        status: 'active | inactive'
      }
    }
  },
  {
    method: 'PATCH',
    path: '/users/:id',
    description: 'Обновить пользователя',
    auth: true,
    adminOnly: true,
    parameters: [
      { name: 'id', type: 'uuid', description: 'ID пользователя', required: true }
    ],
    requestBody: {
      name: 'string (optional)',
      phone: 'string (optional)',
      role: 'admin | manager (optional)',
      status: 'active | inactive (optional)'
    },
    responseBody: {
      user: {
        id: 'uuid',
        email: 'string',
        name: 'string',
        phone: 'string | null',
        role: 'admin | manager',
        status: 'active | inactive'
      }
    }
  },
  {
    method: 'DELETE',
    path: '/users/:id',
    description: 'Деактивировать пользователя',
    auth: true,
    adminOnly: true,
    parameters: [
      { name: 'id', type: 'uuid', description: 'ID пользователя', required: true }
    ],
    responseBody: {
      user: {
        id: 'uuid',
        status: 'inactive'
      }
    }
  },
  {
    method: 'GET',
    path: '/menu',
    description: 'Получить меню для текущего пользователя (с учетом прав доступа)',
    auth: true,
    responseBody: {
      menu: [{
        id: 'number',
        title: 'string',
        path: 'string',
        parent_id: 'number | null',
        order_index: 'number',
        is_active: 'boolean',
        created_at: 'timestamp'
      }]
    }
  },
  {
    method: 'POST',
    path: '/menu',
    description: 'Создать новый пункт меню',
    auth: true,
    adminOnly: true,
    requestBody: {
      title: 'string (required)',
      path: 'string (required)',
      parent_id: 'number (optional)',
      order_index: 'number (optional)'
    },
    responseBody: {
      menuItem: {
        id: 'number',
        title: 'string',
        path: 'string',
        parent_id: 'number | null',
        order_index: 'number',
        is_active: 'boolean'
      }
    }
  },
  {
    method: 'PATCH',
    path: '/menu/:id',
    description: 'Обновить пункт меню',
    auth: true,
    adminOnly: true,
    parameters: [
      { name: 'id', type: 'number', description: 'ID пункта меню', required: true }
    ],
    requestBody: {
      title: 'string (optional)',
      path: 'string (optional)',
      parent_id: 'number (optional)',
      order_index: 'number (optional)',
      is_active: 'boolean (optional)'
    }
  },
  {
    method: 'DELETE',
    path: '/menu/:id',
    description: 'Деактивировать пункт меню',
    auth: true,
    adminOnly: true,
    parameters: [
      { name: 'id', type: 'number', description: 'ID пункта меню', required: true }
    ]
  },
  {
    method: 'GET',
    path: '/permissions/:userId',
    description: 'Получить права доступа пользователя',
    auth: true,
    adminOnly: true,
    parameters: [
      { name: 'userId', type: 'uuid', description: 'ID пользователя', required: true }
    ],
    responseBody: {
      permissions: [{
        id: 'number',
        user_id: 'uuid',
        menu_item_id: 'number',
        can_view: 'boolean',
        can_edit: 'boolean',
        created_at: 'timestamp',
        menu_items: {
          id: 'number',
          title: 'string',
          path: 'string'
        }
      }]
    }
  },
  {
    method: 'POST',
    path: '/permissions/:userId',
    description: 'Назначить права доступа пользователю',
    auth: true,
    adminOnly: true,
    parameters: [
      { name: 'userId', type: 'uuid', description: 'ID пользователя', required: true }
    ],
    requestBody: {
      permissions: [{
        menu_item_id: 'number (required)',
        can_view: 'boolean (default: true)',
        can_edit: 'boolean (default: false)'
      }]
    }
  },
  {
    method: 'PATCH',
    path: '/permissions/:userId/:menuItemId',
    description: 'Изменить конкретное право доступа',
    auth: true,
    adminOnly: true,
    parameters: [
      { name: 'userId', type: 'uuid', description: 'ID пользователя', required: true },
      { name: 'menuItemId', type: 'number', description: 'ID пункта меню', required: true }
    ],
    requestBody: {
      can_view: 'boolean (optional)',
      can_edit: 'boolean (optional)'
    }
  }
];

const methodColors = {
  GET: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  PATCH: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

export default function ApiDocs() {
  const [openEndpoints, setOpenEndpoints] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleEndpoint = (endpoint: string) => {
    const newOpen = new Set(openEndpoints);
    if (newOpen.has(endpoint)) {
      newOpen.delete(endpoint);
    } else {
      newOpen.add(endpoint);
    }
    setOpenEndpoints(newOpen);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано!",
      description: "Код скопирован в буфер обмена",
      duration: 2000,
    });
  };

  const getEndpointUrl = (path: string) => `https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1${path}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              API Документация
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              REST API для системы управления пользователями и ролевым доступом
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Base URL: https://ehznqzaumsnjkrntaiox.supabase.co/functions/v1
              </Badge>
              <Badge variant="outline" className="text-sm px-3 py-1">
                Authentication: JWT Bearer Token
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="endpoints" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
              <TabsTrigger value="auth">Аутентификация</TabsTrigger>
              <TabsTrigger value="errors">Коды ошибок</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-4">
              {endpoints.map((endpoint, index) => {
                const endpointKey = `${endpoint.method}-${endpoint.path}`;
                const isOpen = openEndpoints.has(endpointKey);

                return (
                  <Card key={index}>
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleEndpoint(endpointKey)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={methodColors[endpoint.method]}>
                                {endpoint.method}
                              </Badge>
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {endpoint.path}
                              </code>
                              {endpoint.auth && (
                                <Badge variant="secondary" className="text-xs">
                                  Auth
                                </Badge>
                              )}
                              {endpoint.adminOnly && (
                                <Badge variant="destructive" className="text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isOpen ? 'transform rotate-180' : ''
                              }`}
                            />
                          </div>
                          <CardDescription className="text-left">
                            {endpoint.description}
                          </CardDescription>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-6">
                            {/* Parameters */}
                            {endpoint.parameters && (
                              <div>
                                <h4 className="font-semibold mb-2">Параметры URL:</h4>
                                <div className="space-y-2">
                                  {endpoint.parameters.map((param, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <code className="bg-muted px-2 py-1 rounded font-mono">
                                        {param.name}
                                      </code>
                                      <span className="text-muted-foreground">({param.type})</span>
                                      {param.required && (
                                        <Badge variant="destructive" className="text-xs">
                                          обязательный
                                        </Badge>
                                      )}
                                      <span>- {param.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Request Body */}
                            {endpoint.requestBody && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">Тело запроса:</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(endpoint.requestBody, null, 2))}
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Копировать
                                  </Button>
                                </div>
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                  <code>{JSON.stringify(endpoint.requestBody, null, 2)}</code>
                                </pre>
                              </div>
                            )}

                            {/* Response Body */}
                            {endpoint.responseBody && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">Ответ (200 OK):</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(endpoint.responseBody, null, 2))}
                                  >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Копировать
                                  </Button>
                                </div>
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                  <code>{JSON.stringify(endpoint.responseBody, null, 2)}</code>
                                </pre>
                              </div>
                            )}

                            {/* Example cURL */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold">Пример запроса:</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const curlExample = `curl -X ${endpoint.method} \\
  "${getEndpointUrl(endpoint.path)}" \\
  ${endpoint.auth ? '-H "Authorization: Bearer YOUR_JWT_TOKEN" \\' : ''}
  -H "Content-Type: application/json"${endpoint.requestBody ? ' \\\n  -d \'' + JSON.stringify(endpoint.requestBody) + '\'' : ''}`;
                                    copyToClipboard(curlExample);
                                  }}
                                >
                                  <Copy className="w-4 h-4 mr-1" />
                                  Копировать cURL
                                </Button>
                              </div>
                              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                <code>
                                  {`curl -X ${endpoint.method} \\
  "${getEndpointUrl(endpoint.path)}" \\
  ${endpoint.auth ? '-H "Authorization: Bearer YOUR_JWT_TOKEN" \\' : ''}
-H "Content-Type: application/json"${endpoint.requestBody ? ' \\\n  -d \'' + JSON.stringify(endpoint.requestBody) + '\'' : ''}`}
                                </code>
                              </pre>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="auth" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Аутентификация</CardTitle>
                  <CardDescription>
                    API использует Supabase Auth с JWT токенами для аутентификации
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">1. Регистрация пользователя</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Используйте Supabase Auth SDK для регистрации:
                    </p>
                    <pre className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})`}</code>
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">2. Получение JWT токена</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      При успешной авторизации получите токен:
                    </p>
                    <pre className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`const { data: { session }, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

const token = session?.access_token`}</code>
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">3. Использование токена</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Добавьте токен в заголовок Authorization:
                    </p>
                    <pre className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`Authorization: Bearer YOUR_JWT_TOKEN`}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Коды ошибок</CardTitle>
                  <CardDescription>
                    Стандартные HTTP статус-коды и формат ошибок
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">400 Bad Request</h4>
                        <p className="text-sm text-muted-foreground">
                          Некорректные данные запроса
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">401 Unauthorized</h4>
                        <p className="text-sm text-muted-foreground">
                          Отсутствует или недействительный токен
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">403 Forbidden</h4>
                        <p className="text-sm text-muted-foreground">
                          Недостаточно прав доступа
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">404 Not Found</h4>
                        <p className="text-sm text-muted-foreground">
                          Ресурс не найден
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">405 Method Not Allowed</h4>
                        <p className="text-sm text-muted-foreground">
                          HTTP метод не поддерживается
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">500 Internal Server Error</h4>
                        <p className="text-sm text-muted-foreground">
                          Внутренняя ошибка сервера
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Формат ошибки:</h4>
                      <pre className="bg-muted p-4 rounded-lg text-sm">
                        <code>{JSON.stringify({
                          error: "Описание ошибки"
                        }, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}