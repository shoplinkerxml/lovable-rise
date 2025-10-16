import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronDown, Copy, CheckCircle, Download, Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/providers/i18n-provider';

interface ApiEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  description: string;
  headers?: Record<string, string>;
  body?: any;
  response: any;
  postmanScript?: string;
}

export default function ApiDocs() {
  const [openEndpoints, setOpenEndpoints] = useState<Set<string>>(new Set());
  const [customScripts, setCustomScripts] = useState<Record<string, string>>({});
  const [editingScript, setEditingScript] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const { toast } = useToast();
  const { t } = useI18n();

  // Загружаем сохранённые скрипты и API ключ из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('postman-scripts');
      if (saved) {
        setCustomScripts(JSON.parse(saved));
      }
      
      const savedApiKey = localStorage.getItem('supabase-apikey');
      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
      
      const savedEmail = localStorage.getItem('admin-email');
      if (savedEmail) {
        setAdminEmail(savedEmail);
      }
      
      const savedPassword = localStorage.getItem('admin-password');
      if (savedPassword) {
        setAdminPassword(savedPassword);
      }
    } catch (e) {
      console.warn('Не удалось загрузить данные из localStorage', e);
    }
  }, []);

  // Сохраняем скрипты в localStorage (функциональное обновление во избежание потери данных)
  const saveScripts = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    setCustomScripts(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem('postman-scripts', JSON.stringify(next));
      } catch (e) {
        console.warn('Не удалось сохранить скрипты в localStorage', e);
      }
      return next;
    });
  };


  const updateScript = (endpointKey: string, script: string) => {
    saveScripts(prev => ({ ...prev, [endpointKey]: script }));
    toast({
      title: t("script_updated"),
      description: t("script_saved"),
      duration: 2000,
    });
  };

  const updateApiKey = (newApiKey: string) => {
    setApiKey(newApiKey);
    try {
      localStorage.setItem('supabase-apikey', newApiKey);
      toast({
        title: t("api_key_saved"),
        description: t("api_key_used"),
        duration: 2000,
      });
    } catch (e) {
      console.warn('Не удалось сохранить API ключ в localStorage', e);
    }
  };

  const updateAdminEmail = (email: string) => {
    setAdminEmail(email);
    try {
      localStorage.setItem('admin-email', email);
    } catch (e) {
      console.warn('Не удалось сохранить email в localStorage', e);
    }
  };

  const updateAdminPassword = (password: string) => {
    setAdminPassword(password);
    try {
      localStorage.setItem('admin-password', password);
    } catch (e) {
      console.warn('Не удалось сохранить password в localStorage', e);
    }
  };

  const getEndpointKey = (endpoint: ApiEndpoint) => {
    return `${endpoint.method}-${endpoint.endpoint}`;
  };

  const getPostmanScript = (endpoint: ApiEndpoint) => {
    const key = getEndpointKey(endpoint);
    return customScripts[key] || endpoint.postmanScript || '';
  };

  const startEditingScript = (endpointKey: string) => {
    setEditingScript(endpointKey);
  };

  const stopEditingScript = () => {
    setEditingScript(null);
  };

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
      title: t("copied"),
      description: t("copied_clipboard"),
      duration: 2000,
    });
  };

  const endpoints: ApiEndpoint[] = [
    // Токен endpoint
    {
      name: 'Get Auth Token',
      method: 'POST',
      endpoint: '/auth/v1/token?grant_type=password',
      description: 'Получить JWT токен для аутентификации',
      body: {
        email: "user@example.com",
        password: "your_password"
      },
      response: {
        access_token: "jwt_token_here",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "refresh_token_here"
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

if (responseData.access_token) {
    pm.collectionVariables.set("access_token", responseData.access_token);
}`
    },
    
    // Signup endpoint
    {
      name: 'Register User',
      method: 'POST', 
      endpoint: '/auth/v1/signup',
      description: 'Регистрация нового пользователя',
      body: {
        email: "manager@testmail.com",
        password: "ManagerPass123"
      },
      response: {
        id: "uuid-here",
        email: "manager@testmail.com"
      },
      postmanScript: `// Проверяем, что статус 200
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Парсим ответ
let responseData = pm.response.json();

// Сохраняем manager_id в переменную коллекции, если есть поле id
if (responseData.id) {
    pm.collectionVariables.set("manager_id", responseData.id);
    console.log("manager_id сохранён:", responseData.id);
} else {
    console.warn("id пользователя не найден в ответе!");
}`
    },
    
    // Auth Me endpoint
    {
      name: 'Get Current User',
      method: 'GET',
      endpoint: '/functions/v1/auth-me',
      description: 'Получить информацию о текущем пользователе',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      response: {
        user: {
          id: "uuid",
          email: "user@example.com",
          name: "Имя пользователя",
          phone: "+380501234567",
          role: "manager",
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        }
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

if (responseData.user && responseData.user.id) {
    pm.collectionVariables.set("current_user_id", responseData.user.id);
    console.log("current_user_id сохранён:", responseData.user.id);
}`
    },
    
    // Profiles endpoints
    {
      name: 'Update Profile',
      method: 'PATCH',
      endpoint: '/rest/v1/profiles?id=eq.{{manager_id}}',
      description: 'Обновить профиль пользователя после регистрации',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      body: {
        name: "Manager Name",
        phone: "+380991112233"
      },
      response: {
        id: "uuid",
        email: "manager@testmail.com",
        name: "Manager Name", 
        phone: "+380991112233",
        role: "manager",
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

console.log("Профиль пользователя обновлён:", responseData);`
    },
    
    // Users endpoints
    {
      name: 'Get Users',
      method: 'GET',
      endpoint: '/functions/v1/users',
      description: 'Получить список всех пользователей',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      response: {
        users: [
          {
            id: "uuid",
            email: "user@example.com",
            name: "Имя пользователя",
            phone: "+380501234567",
            role: "manager",
            status: "active",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
          }
        ]
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

// Сохраняем ID первого пользователя для дальнейшего использования
if (responseData.users && responseData.users.length > 0) {
    pm.collectionVariables.set("first_user_id", responseData.users[0].id);
    console.log("first_user_id сохранён:", responseData.users[0].id);
}`
    },
    {
      name: 'Update User',
      method: 'PATCH',
      endpoint: '/functions/v1/users/{id}',
      description: 'Обновить данные пользователя',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      body: {
        name: "Новое имя",
        phone: "+380987654321",
        role: "admin",
        status: "inactive"
      },
      response: {
        user: {
          id: "uuid",
          email: "test@example.com",
          name: "Новое имя",
          phone: "+380987654321",
          role: "admin", 
          status: "inactive",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        }
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

console.log("Пользователь обновлён:", responseData.user);`
    },
    {
      name: 'Delete User',
      method: 'DELETE',
      endpoint: '/functions/v1/users/{id}',
      description: 'Деактивировать пользователя',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      response: {
        user: {
          id: "uuid",
          email: "test@example.com",
          name: "Тест Пользователь",
          phone: "+380501234567",
          role: "manager",
          status: "inactive",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z"
        }
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

console.log("Пользователь деактивирован:", responseData.user);`
    },
    
    // Menu endpoints
    {
      name: 'Get Menu',
      method: 'GET',
      endpoint: '/functions/v1/menu',
      description: 'Получить структурированное меню для текущего пользователя',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      response: {
        menu: [
          {
            id: 1,
            title: "Главное меню",
            path: "/main",
            parent_id: null,
            order_index: 1,
            is_active: true,
            created_at: "2024-01-01T00:00:00Z",
            children: [
              {
                id: 2,
                title: "Подменю",
                path: "/main/sub",
                parent_id: 1,
                order_index: 1,
                is_active: true,
                created_at: "2024-01-01T00:00:00Z"
              }
            ]
          }
        ]
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

// Сохраняем ID первого пункта меню
if (responseData.menu && responseData.menu.length > 0) {
    pm.collectionVariables.set("menu_item_id", responseData.menu[0].id);
    console.log("menu_item_id сохранён:", responseData.menu[0].id);
}`
    },
    
    // Permissions endpoints
    {
      name: 'Get User Permissions',
      method: 'GET', 
      endpoint: '/functions/v1/permissions?user_id={{current_user_id}}',
      description: 'Получить права доступа пользователя',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      response: {
        permissions: [
          {
            id: 1,
            user_id: "uuid",
            menu_item_id: 1,
            can_view: true,
            can_edit: false,
            created_at: "2024-01-01T00:00:00Z",
            menu_items: {
              id: 1,
              title: "Главное меню",
              path: "/main"
            }
          }
        ]
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

console.log("Получены права доступа:", responseData.permissions);`
    },
    {
      name: 'Update User Permissions',
      method: 'POST',
      endpoint: '/functions/v1/permissions',
      description: 'Обновить права доступа пользователя к пунктам меню',
      headers: {
        'Authorization': 'Bearer {{access_token}}'
      },
      body: {
        user_id: "{{current_user_id}}",
        permissions: [
          {
            menu_item_id: 1,
            can_view: true,
            can_edit: false
          },
          {
            menu_item_id: 2,
            can_view: true,
            can_edit: true
          }
        ]
      },
      response: {
        message: "Права доступа успешно обновлены",
        updated_permissions: 2
      },
      postmanScript: `pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

let responseData = pm.response.json();

console.log("Права доступа обновлены:", responseData);`
    }
  ];

  const methodColors = {
    GET: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
    POST: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary',
    PATCH: 'bg-accent/50 text-accent-foreground dark:bg-accent/20 dark:text-accent-foreground',
    DELETE: 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive'
  };

  const generateCurlCommand = (endpoint: ApiEndpoint) => {
    const baseUrl = 'https://ehznqzaumsnjkrntaiox.supabase.co';
    const fullUrl = `${baseUrl}${endpoint.endpoint}`;
    
    let curlCmd = `curl -X ${endpoint.method} "${fullUrl}"`;
    
    // Добавляем apikey для всех запросов к Supabase API
    if (endpoint.endpoint.includes('/auth/v1/') || endpoint.endpoint.includes('/rest/v1/')) {
      const apikeyValue = apiKey || 'YOUR_APIKEY_HERE';
      curlCmd += ` \\\n  -H "apikey: ${apikeyValue}"`;
    }
    
    if (endpoint.headers) {
      Object.entries(endpoint.headers).forEach(([key, value]) => {
        curlCmd += ` \\\n  -H "${key}: ${value.replace('{{access_token}}', 'YOUR_TOKEN_HERE')}"`;
      });
    }
    
    curlCmd += ` \\\n  -H "Content-Type: application/json"`;
    
    if (endpoint.body) {
      let body = { ...endpoint.body };
      
      // Подставляем admin email и password для auth токена
      if (endpoint.name === 'Get Auth Token') {
        body.email = adminEmail || "user@example.com";
        body.password = adminPassword || "your_password";
      }
      
      curlCmd += ` \\\n  -d '${JSON.stringify(body, null, 2)}'`;
    }
    
    return curlCmd;
  };

  const generatePostmanCollection = () => {
    const baseUrl = 'https://ehznqzaumsnjkrntaiox.supabase.co';
    
    // Отладка: проверяем какие скрипты у нас есть
    console.log('Кастомные скрипты при генерации коллекции:', customScripts);
    
    const collection = {
      info: {
        name: "API Documentation Collection",
        description: "Postman коллекция для тестирования API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      variable: [
        {
          key: "base_url",
          value: baseUrl
        },
          {
            key: "access_token", 
            value: "",
            type: "string"
          },
          {
            key: "manager_id",
            value: "",
            type: "string"
          },
          {
            key: "current_user_id",
            value: "",
            type: "string"
          },
          {
            key: "first_user_id",
            value: "",
            type: "string"
          },
          {
            key: "menu_item_id",
            value: "",
            type: "string"
          }
      ],
      item: endpoints.map((endpoint) => {
        const endpointKey = getEndpointKey(endpoint);
        const script = getPostmanScript(endpoint);
        
        // Отладка: проверяем каждый скрипт
        console.log(`Endpoint: ${endpoint.name}, Key: ${endpointKey}, Script exists: ${!!script}`);
        
        const requestData = {
          name: endpoint.name,
          url: `${baseUrl}${endpoint.endpoint}`,
          method: endpoint.method,
          header: [
            {
              key: 'Content-Type',
              value: 'application/json'
            },
            ...(endpoint.headers ? Object.entries(endpoint.headers).map(([key, value]) => ({
              key,
              value: value.replace('{{jwt_token}}', '{{access_token}}')
            })) : [])
          ],
          ...(endpoint.body && {
            body: {
              mode: 'raw',
              raw: (() => {
                let body = { ...endpoint.body };
                
                // Подставляем admin email и password для auth токена
                if (endpoint.name === 'Get Auth Token') {
                  body.email = adminEmail || "user@example.com";
                  body.password = adminPassword || "your_password";
                }
                
                return JSON.stringify(body, null, 2);
              })()
            }
          })
        }

        // Добавляем apikey для всех запросов к Supabase API
        if (endpoint.endpoint.includes('/auth/v1/') || endpoint.endpoint.includes('/rest/v1/')) {
          const apikeyValue = apiKey || 'YOUR_APIKEY_HERE';
          requestData.header.push({
            key: "apikey",
            value: apikeyValue
          });
        }

        return {
          name: endpoint.name,
          request: requestData,
          ...(script && script.trim() && {
            event: [{
              listen: "test",
              script: {
                exec: script.split('\n').filter(line => line.trim() !== '')
              }
            }]
          })
        };
      })
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collection, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "api-collection.postman_collection.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    toast({
      title: t("collection_downloaded"),
      description: t("collection_ready"),
      duration: 3000,
    });
  };

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
                Base URL: https://ehznqzaumsnjkrntaiox.supabase.co
              </Badge>
              <Badge variant="outline" className="text-sm px-3 py-1">
                Authentication: JWT Bearer Token
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={generatePostmanCollection}
                      className="text-sm"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Скачать Postman коллекцию</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Поля конфигурации */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              {/* API ключ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">API ключ</CardTitle>
                  <CardDescription>
                    Supabase API ключ для запросов
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor="apikey">Supabase API Key (anon)</Label>
                      <Input
                        id="apikey"
                        type="text"
                        value={apiKey}
                        onChange={(e) => updateApiKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="font-mono text-sm"
                      />
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(apiKey)}
                            disabled={!apiKey}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Копировать API ключ</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>

              {/* Email и Password */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Данные администратора</CardTitle>
                  <CardDescription>
                    Email и пароль для получения токена
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="admin-email">Email администратора</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => updateAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-password">Пароль</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminPassword}
                        onChange={(e) => updateAdminPassword(e.target.value)}
                        placeholder="password"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="endpoints" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
              <TabsTrigger value="workflow">Процесс работы</TabsTrigger>
              <TabsTrigger value="errors">Коды ошибок</TabsTrigger>
            </TabsList>

            <TabsContent value="endpoints" className="space-y-4">
              {endpoints.map((endpoint, index) => {
                const endpointKey = `${endpoint.method}-${endpoint.endpoint}`;
                const isOpen = openEndpoints.has(endpointKey);
                const currentScript = getPostmanScript(endpoint);
                const isEditingCurrentScript = editingScript === endpointKey;

                return (
                  <Card key={index}>
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleEndpoint(endpointKey)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className={methodColors[endpoint.method]}>
                                {endpoint.method}
                              </Badge>
                              <div>
                                <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                                <CardDescription className="font-mono text-sm">
                                  {endpoint.endpoint}
                                </CardDescription>
                              </div>
                            </div>
                            <ChevronDown 
                              className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-6">
                            <p className="text-muted-foreground">{endpoint.description}</p>
                            
                            <Tabs defaultValue="curl" className="w-full">
                              <TabsList>
                                <TabsTrigger value="curl">cURL</TabsTrigger>
                                <TabsTrigger value="response">Ответ</TabsTrigger>
                                <TabsTrigger value="postman">Postman Script</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="curl">
                                <div className="relative">
                                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                    <code>{generateCurlCommand(endpoint)}</code>
                                  </pre>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="absolute top-2 right-2"
                                          onClick={() => copyToClipboard(generateCurlCommand(endpoint))}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Копировать cURL</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="response">
                                <div className="relative">
                                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                    <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                                  </pre>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="absolute top-2 right-2"
                                          onClick={() => copyToClipboard(JSON.stringify(endpoint.response, null, 2))}
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Копировать ответ</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="postman">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor={`script-${index}`} className="text-sm font-medium">
                                      Postman Test Script
                                    </Label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => isEditingCurrentScript ? stopEditingScript() : startEditingScript(endpointKey)}
                                    >
                                      {isEditingCurrentScript ? (
                                        <>
                                          <Save className="w-4 h-4 mr-2" />
                                          Готово
                                        </>
                                      ) : (
                                        <>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Редактировать
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  
                                  {isEditingCurrentScript ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        id={`script-${index}`}
                                        value={currentScript}
                                        onChange={(e) => updateScript(endpointKey, e.target.value)}
                                        placeholder="Введите Postman тест скрипт..."
                                        className="min-h-[200px] font-mono text-sm"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        Здесь вы можете написать JavaScript код для тестирования ответа и сохранения переменных в Postman коллекции.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm min-h-[100px]">
                                        <code>{currentScript || '// Postman скрипт не задан'}</code>
                                      </pre>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="absolute top-2 right-2"
                                              onClick={() => copyToClipboard(currentScript)}
                                              disabled={!currentScript}
                                            >
                                              <Copy className="w-4 h-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Копировать скрипт</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="workflow" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Процесс создания пользователя</CardTitle>
                  <CardDescription>
                    Правильная последовательность действий для создания нового пользователя
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-primary/10 text-primary shrink-0">1</Badge>
                      <div>
                        <h4 className="font-medium">Получить токен администратора</h4>
                        <p className="text-sm text-muted-foreground">POST /auth/v1/token?grant_type=password с данными админа</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge className="bg-primary/10 text-primary shrink-0">2</Badge>
                      <div>
                        <h4 className="font-medium">Зарегистрировать пользователя</h4>
                        <p className="text-sm text-muted-foreground">POST /auth/v1/signup с email и паролем нового пользователя</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Badge className="bg-primary/10 text-primary shrink-0">3</Badge>
                      <div>
                        <h4 className="font-medium">Обновить профиль</h4>
                        <p className="text-sm text-muted-foreground">PATCH /rest/v1/profiles?id=eq.{'{{manager_id}}'} с дополнительными данными</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-accent/10 rounded-lg border">
                    <h5 className="font-medium mb-2">Важно!</h5>
                    <p className="text-sm text-muted-foreground">
                      Создание пользователей через endpoint /functions/v1/users требует прав администратора. 
                      Для публичной регистрации используйте /auth/v1/signup.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errors" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Коды состояния HTTP</CardTitle>
                  <CardDescription>
                    Стандартные коды ответов API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-medium text-primary">Успешные ответы</h4>
                      <div className="space-y-1 text-sm">
                        <div><code className="bg-muted px-1 py-0.5 rounded">200</code> OK - Запрос выполнен успешно</div>
                        <div><code className="bg-muted px-1 py-0.5 rounded">201</code> Created - Ресурс создан</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive">Ошибки клиента</h4>
                      <div className="space-y-1 text-sm">
                        <div><code className="bg-muted px-1 py-0.5 rounded">400</code> Bad Request - Неверный запрос</div>
                        <div><code className="bg-muted px-1 py-0.5 rounded">401</code> Unauthorized - Не авторизован</div>
                        <div><code className="bg-muted px-1 py-0.5 rounded">403</code> Forbidden - Доступ запрещен</div>
                        <div><code className="bg-muted px-1 py-0.5 rounded">404</code> Not Found - Ресурс не найден</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Примеры ошибок</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium mb-2">401 Unauthorized</h5>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "error": "Unauthorized",
  "message": "JWT token is required"
}`}
                      </pre>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">403 Forbidden</h5>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "error": "Forbidden - Admin access required"
}`}
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