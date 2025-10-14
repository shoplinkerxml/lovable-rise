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
        const { data, error } = await (supabase as any)
          .from('user_subscriptions')
          .select('*, tariffs(*)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (!error && data) {
          const end = data.end_date ? new Date(data.end_date) : null;
          setEndDate(end ? end.toISOString() : null);
          setTariffName(data.tariffs?.name || null);
          setDurationDays(data.tariffs?.duration_days ?? null);
          const isExpired = end ? end.getTime() < Date.now() : false;
          setExpired(isExpired);
          const tariffId = data.tariffs?.id ?? data.tariff_id;
          setIsDemo((data.tariffs?.is_free === true) && (data.tariffs?.visible === false));
          setIsLifetime(data.tariffs?.is_lifetime === true);
          if (tariffId) {
            try {
              const limitsData = await TariffService.getTariffLimits(tariffId);
              setLimits(limitsData || []);
            } catch {}
          }
        } else if (!error && !data) {
          // No active subscription found — try auto-activating hidden free demo tariff
          try {
            const { data: demoTariff } = await (supabase as any)
              .from('tariffs')
              .select('*')
              .eq('is_free', true)
              .eq('visible', false)
              .eq('is_active', true)
              .order('sort_order', { ascending: true })
              .limit(1)
              .maybeSingle();
            if (demoTariff) {
              await (supabase as any)
                .from('user_subscriptions')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('is_active', true);
              const start = new Date();
              let endDate: string | null = null;
              if (demoTariff.duration_days) {
                endDate = new Date(start.getTime() + demoTariff.duration_days * 24 * 60 * 60 * 1000).toISOString();
              }
              const { data: newSub, error: insertErr } = await (supabase as any)
                .from('user_subscriptions')
                .insert({
                  user_id: user.id,
                  tariff_id: demoTariff.id,
                  start_date: start.toISOString(),
                  end_date: endDate,
                  is_active: true
                })
                .select('*, tariffs(*)')
                .maybeSingle();
              if (!insertErr && newSub) {
                const end = newSub.end_date ? new Date(newSub.end_date) : null;
                setEndDate(end ? end.toISOString() : null);
                setTariffName(newSub.tariffs?.name || demoTariff.name || null);
                setDurationDays(demoTariff.duration_days ?? null);
                setExpired(false);
                setIsDemo(true);
                setIsLifetime(false);
                try {
                  const limitsData = await TariffService.getTariffLimits(demoTariff.id);
                  setLimits(limitsData || []);
                } catch {}
              }
            }
          } catch (e) {
            // Silent if demo activation fails
          }
        }
      } catch (e) {
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
                    <Crown className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-emerald-700" />
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
      <div className="grid grid-cols-1 gap-6">
        {/* Quick Stats */}
        <div className="p-6">
          {/* Place tariff selection button after main info if expired */}
          {expired && (
            <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => window.location.href = '/user/tariff'}>
              {t('select_plan') || 'Выбрать тариф'}
            </Button>
          )}
        </div>
      </div>

      {/* Removed Menu Management Section and Getting Started Section as requested */}
    </div>;
};
export default UserDashboard;