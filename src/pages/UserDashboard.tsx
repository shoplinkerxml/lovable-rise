import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserProfile as UserProfileType } from "@/lib/user-auth-schemas";
import { UserMenuItem } from "@/lib/user-menu-service";
import { useI18n } from "@/providers/i18n-provider";
import { User, Settings, TrendingUp, BarChart3, Activity, Plus, Crown, CreditCard } from "lucide-react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { TariffService } from "@/lib/tariff-service";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionValidationService } from "@/lib/subscription-validation-service";
interface UserDashboardContextType {
  user: UserProfileType;
  menuItems: UserMenuItem[];
  onMenuUpdate: () => void;
}
const UserDashboard = () => {
  const {
    user,
    menuItems,
    onMenuUpdate
  } = useOutletContext<UserDashboardContextType>();
  const { t } = useI18n();
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Breadcrumb items using shadcn/ui breadcrumb
  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('menu_main') || 'Main', href: '/user/dashboard' },
    { label: t('menu_dashboard') || 'Dashboard', current: true }
  ];

  // Load active subscription info (end_date) for alert
  const [endDate, setEndDate] = useState<string | null>(null);
  const [tariffName, setTariffName] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [expired, setExpired] = useState<boolean>(false);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isLifetime, setIsLifetime] = useState<boolean>(false);
  const [limits, setLimits] = useState<{ limit_name: string; value: number; id?: number }[]>([]);

  useEffect(() => {
    async function loadSubscription() {
      try {
        // Use new validation service that checks end_date and deactivates expired subscriptions
        const result = await SubscriptionValidationService.ensureValidSubscription(user.id);
        
        if (result.hasValidSubscription && result.subscription) {
          const data = result.subscription;
          const end = data.end_date ? new Date(data.end_date) : null;
          setEndDate(end ? end.toISOString() : null);
          setTariffName(data.tariffs?.name || null);
          setDurationDays(data.tariffs?.duration_days ?? null);
          setExpired(false); // If subscription is valid, it's not expired
          setIsDemo(result.isDemo);
          setIsLifetime(data.tariffs?.is_lifetime === true);
          
          const tariffId = data.tariffs?.id ?? data.tariff_id;
          if (tariffId) {
            try {
              const limitsData = await TariffService.getTariffLimits(tariffId);
              setLimits(limitsData || []);
            } catch {}
          }
        } else {
          // No valid subscription
          setEndDate(null);
          setTariffName(null);
          setDurationDays(null);
          setExpired(false);
          setIsDemo(false);
          setIsLifetime(false);
          setLimits([]);
        }
      } catch (e) {
        console.error('Error loading subscription:', e);
        // Silent fail, no alert
      }
    }
    loadSubscription();
    const onFocus = () => loadSubscription();
    const onVisibility = () => { if (!document.hidden) loadSubscription(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user.id]);
  return <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Subscription Alert */}
      {tariffName ? (
        !expired ? (
          <Alert className="relative rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 w-fit border-emerald-200 bg-emerald-50 text-emerald-900">
            <AlertCircle />
            <AlertTitle className="col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight">
              {isDemo
                ? `${t('demo_trial_title_prefix')} ${(durationDays ?? 7)}${t('demo_trial_title_suffix')}`
                : t('active_tariff_title')
              }
            </AlertTitle>
            <AlertDescription className="col-start-2 grid justify-items-start gap-2 text-sm [&_p]:leading-relaxed">
              {isDemo ? (<p>{t('demo_trial_desc')}</p>) : null}
              {!isDemo && (
                <div className="flex items-center gap-2">
                  {isLifetime ? (
                    <Crown className="h-4 w-4" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  <span><strong>{tariffName}</strong>{endDate ? ` — ${t('end_date')}: ${new Date(endDate).toLocaleDateString()}` : ''}</span>
                </div>
              )}
              <ul className="list-inside list-disc text-sm">
                {limits.map((l) => (
                  <li key={l.id ?? `${l.limit_name}`}>{l.limit_name} - {l.value}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <AlertTitle>
              {t('subscription_expired') || 'Ваш тариф закончился'}
            </AlertTitle>
            <AlertDescription>
              <span>
                {t('please_select_new_tariff') || 'Пожалуйста, выберите новый тариф, чтобы продолжить работу.'}
              </span>
            </AlertDescription>
          </Alert>
        )
      ) : null}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Quick Stats Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('total_menu_items') || 'Всего пунктов меню'}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuItems.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('active_menu_items') || 'активных пунктов меню'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('user_profile') || 'Профиль пользователя'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getUserInitials(user.name)}</div>
            <p className="text-xs text-muted-foreground">
              {user.email}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('subscription_status') || 'Статус подписки'}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tariffName ? (
                <Badge variant={expired ? "destructive" : "default"}>
                  {expired ? (t('expired') || 'Истекла') : (t('active') || 'Активна')}
                </Badge>
              ) : (
                <Badge variant="secondary">{t('no_subscription') || 'Нет подписки'}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {tariffName || (t('no_active_plan') || 'Нет активного плана')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recent_activity') || 'Последняя активность'}</CardTitle>
          <CardDescription>
            {t('recent_activity_desc') || 'Ваша последняя активность в системе'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center space-x-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {t('activity_item') || 'Активность'} #{item}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('activity_description') || 'Описание активности'} {item}
                  </p>
                </div>
                <div className="ml-auto font-medium">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>{t('quick_settings') || 'Быстрые настройки'}</CardTitle>
          <CardDescription>
            {t('quick_settings_desc') || 'Быстрый доступ к основным настройкам'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <Settings className="mr-2 h-4 w-4" />
              {t('profile_settings') || 'Настройки профиля'}
            </Button>
            <Button variant="outline" className="justify-start">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('analytics') || 'Аналитика'}
            </Button>
            {expired && (
              <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 justify-start" onClick={() => window.location.href = '/user/tariff'}>
                <Plus className="mr-2 h-4 w-4" />
                {t('select_plan') || 'Выбрать тариф'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Content for Scroll Testing */}
      <Card>
        <CardHeader>
          <CardTitle>{t('system_info') || 'Информация о системе'}</CardTitle>
          <CardDescription>
            {t('system_info_desc') || 'Техническая информация о вашем аккаунте'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('user_id') || 'ID пользователя'}:</span>
              <span className="text-sm font-mono">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('registration_date') || 'Дата регистрации'}:</span>
              <span className="text-sm">{new Date(user.created_at || '').toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t('last_update') || 'Последнее обновление'}:</span>
              <span className="text-sm">{new Date(user.updated_at || '').toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* More content to ensure scrolling */}
      {[1, 2, 3].map((section) => (
        <Card key={section}>
          <CardHeader>
            <CardTitle>{t('section') || 'Раздел'} {section}</CardTitle>
            <CardDescription>
              {t('section_description') || 'Описание раздела'} {section}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('lorem_ipsum') || 'Это демонстрационный контент для проверки прокрутки страницы. Боковое меню должно оставаться фиксированным, а этот контент должен прокручиваться.'} 
              {' '.repeat(section * 50)}
              {t('additional_content') || 'Дополнительный контент для увеличения высоты страницы и демонстрации работы прокрутки.'}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>;
};
export default UserDashboard;