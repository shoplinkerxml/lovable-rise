import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Crown, CreditCard, AlertCircle, MoreHorizontal, Plus, Trash2, XCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
  avatar_url?: string;
}

interface Subscription {
  id: number;
  tariff_id: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  tariffs: {
    name: string;
    new_price: number | null;
    is_lifetime: boolean;
    duration_days: number | null;
    currency_data: {
      code: string;
      symbol: string;
    };
  };
}

interface Tariff {
  id: number;
  name: string;
  new_price: number | null;
  duration_days: number | null;
  is_lifetime: boolean;
  is_popular: boolean;
  currency: {
    code: string;
    symbol: string;
  };
}

const AdminUserDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<Subscription[]>([]);
  const [availableTariffs, setAvailableTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('menu_main') || 'Головна', href: '/admin/dashboard' },
    { label: t('menu_users') || 'Користувачі', href: '/admin/users' },
    { label: user?.name || '...', current: true }
  ];

  useEffect(() => {
    if (id) {
      loadUserData();
    }
  }, [id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) throw profileError;
      setUser(profile);

      // Load active subscription
      const { data: activeSub } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          tariffs (
            name,
            new_price,
            is_lifetime,
            currency:currencies(code, symbol)
          )
        `)
        .eq('user_id', id)
        .eq('is_active', true)
        .maybeSingle();

      setActiveSubscription(activeSub as any);

      // Load subscription history
      const { data: history } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          tariffs (
            name,
            new_price,
            is_lifetime,
            duration_days,
            currency:currencies(code, symbol)
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      setSubscriptionHistory((history as any) || []);

      // Load all available tariffs with currency
      try {
        const { data: tariffsData, error: tariffsError } = await (supabase as any)
          .from('tariffs')
          .select('*')
          .eq('is_visible', true)
          .order('sort_order', { ascending: true });

        if (!tariffsError && tariffsData) {
          // Load currency data for each tariff
          const tariffsWithCurrency = await Promise.all(
            tariffsData.map(async (tariff: any) => {
              const { data: currency } = await (supabase as any)
                .from('currencies')
                .select('*')
                .eq('id', tariff.currency_id)
                .single();
              return { ...tariff, currency: currency || { code: 'USD', symbol: '$' } };
            })
          );
          setAvailableTariffs(tariffsWithCurrency);
        }
      } catch (error) {
        console.error('Error loading tariffs:', error);
        setAvailableTariffs([]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'UAH': '₴'
    };
    return symbols[code] || code;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Помилка</AlertTitle>
          <AlertDescription>Користувача не знайдено</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Active Tariff Alert */}
      {activeSubscription && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {activeSubscription.tariffs.is_lifetime ? (
              <Crown className="h-4 w-4 text-yellow-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-emerald-700" />
            )}
            {t('active_tariff_title') || 'Активний тарифний план'}
          </AlertTitle>
          <AlertDescription>
            <strong>{activeSubscription.tariffs.name}</strong>
            {activeSubscription.end_date && (
              <> — {t('end_date') || 'Дата закінчення'}: {format(new Date(activeSubscription.end_date), 'dd.MM.yyyy')}</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Tariff Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('active_tariff') || 'Активний тариф'}
            </CardTitle>
            {activeSubscription?.tariffs.is_lifetime ? (
              <Crown className="h-4 w-4 text-yellow-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSubscription ? activeSubscription.tariffs.name : t('no_tariff') || 'Немає'}
            </div>
            {activeSubscription?.tariffs.new_price && (
              <p className="text-xs text-muted-foreground">
                {getCurrencySymbol(activeSubscription.tariffs.currency_data.code)}
                {activeSubscription.tariffs.new_price}
                {!activeSubscription.tariffs.is_lifetime && '/міс'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Empty cards for future data */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статистика 1</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Дані будуть додані</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статистика 2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Дані будуть додані</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Статистика 3</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Дані будуть додані</p>
          </CardContent>
        </Card>
      </div>

      {/* Visits Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>{t('visits_chart') || 'Графік відвідувань'}</CardTitle>
          <CardDescription>
            {t('visits_chart_desc') || 'Статистика буде доступна найближчим часом'}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground">
          Дані відсутні
        </CardContent>
      </Card>

      {/* Available Tariffs Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('available_tariffs')}</h2>
          <p className="text-muted-foreground">
            {t('manage_user_subscriptions')}
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {availableTariffs.map((tariff) => {
            const userSubscription = subscriptionHistory.find(sub => sub.tariff_id === tariff.id);
            const isActive = userSubscription?.is_active || false;
            
            return (
              <Card key={tariff.id} className={isActive ? 'border-emerald-500 shadow-md' : ''}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {tariff.name}
                  </CardTitle>
                  {tariff.is_lifetime ? (
                    <Crown className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tariff.new_price ? (
                      <>
                        {getCurrencySymbol(tariff.currency.code)}
                        {tariff.new_price}
                      </>
                    ) : (
                      t('free') || 'Безкоштовно'
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tariff.is_lifetime ? (
                      t('lifetime') || 'Безстроково'
                    ) : (
                      `${tariff.duration_days} ${t('days') || 'днів'}`
                    )}
                  </p>
                  
                  {/* Subscription Status */}
                  <div className="mt-4 flex items-center gap-2">
                    {isActive ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Активна</span>
                      </>
                    ) : userSubscription ? (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">Неактивна</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Не придбано</span>
                    )}
                  </div>
                  
                  {/* End Date if active */}
                  {isActive && userSubscription?.end_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('end_date') || 'Закінчення'}: {format(new Date(userSubscription.end_date), 'dd.MM.yyyy')}
                    </p>
                  )}
                  
                  {/* Action Button */}
                  <Button 
                    className="w-full mt-4" 
                    variant={isActive ? 'outline' : 'default'}
                    size="sm"
                  >
                    {isActive ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Деактивувати
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Активувати
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Subscription History Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('subscription_history') || 'Історія підписок'}</CardTitle>
          <CardDescription>
            {t('subscription_history_desc') || 'Всі підписки користувача'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Іконка</TableHead>
                <TableHead>{t('tariff_name') || 'Назва тарифу'}</TableHead>
                <TableHead>{t('price') || 'Ціна'}</TableHead>
                <TableHead>{t('start_date') || 'Дата активації'}</TableHead>
                <TableHead>{t('end_date') || 'Дата закінчення'}</TableHead>
                <TableHead>{t('status') || 'Статус'}</TableHead>
                <TableHead className="text-right">{t('actions') || 'Дії'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptionHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t('no_subscriptions') || 'Немає підписок'}
                  </TableCell>
                </TableRow>
              ) : (
                subscriptionHistory.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      {sub.tariffs.is_lifetime ? (
                        <Crown className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-emerald-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{sub.tariffs.name}</TableCell>
                    <TableCell>
                      {sub.tariffs.new_price ? (
                        <>
                          {getCurrencySymbol(sub.tariffs.currency_data.code)}
                          {sub.tariffs.new_price}
                        </>
                      ) : (
                        t('free') || 'Безкоштовно'
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(sub.start_date), 'dd.MM.yyyy')}</TableCell>
                    <TableCell>
                      {sub.end_date ? format(new Date(sub.end_date), 'dd.MM.yyyy') : t('lifetime') || 'Безстроково'}
                    </TableCell>
                    <TableCell>
                      {sub.is_active ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Активна</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm">Неактивна</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserDetails;
