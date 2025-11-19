import { useOutletContext } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SubscriptionValidationService } from "@/lib/subscription-validation-service";
import { useUserData } from "@/providers/user-provider";
interface UserDashboardContextType {
  user: UserProfileType;
  subscription: any | null;
  menuItems: UserMenuItem[];
  onMenuUpdate: () => void;
}
const UserDashboard = () => {
  const {
    user,
    subscription,
    menuItems,
    onMenuUpdate
  } = useOutletContext<UserDashboardContextType>();
  const { subscription: providerSubscription, tariffLimits } = useUserData();
  const {
    t
  } = useI18n();
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Breadcrumb items using shadcn/ui breadcrumb
  const breadcrumbs: BreadcrumbItem[] = [{
    label: t('menu_main') || 'Main',
    href: '/user/dashboard'
  }, {
    label: t('menu_dashboard') || 'Dashboard',
    current: true
  }];

  // Load active subscription info (end_date) for alert
  const [endDate, setEndDate] = useState<string | null>(null);
  const [tariffName, setTariffName] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [expired, setExpired] = useState<boolean>(false);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isLifetime, setIsLifetime] = useState<boolean>(false);
  const [limits, setLimits] = useState<{
    limit_name: string;
    value: number;
    id?: number;
  }[]>([]);
  useEffect(() => {
    const data = providerSubscription ?? subscription;
    if (data && data.hasValidSubscription && data.subscription) {
      const s = data.subscription;
      const end = s.end_date ? new Date(s.end_date) : null;
      setEndDate(end ? end.toISOString() : null);
      setTariffName(s.tariffs?.name || null);
      setDurationDays(s.tariffs?.duration_days ?? null);
      setExpired(false);
      setIsDemo(data.isDemo);
      setIsLifetime(s.tariffs?.is_lifetime === true);
    } else {
      setEndDate(null);
      setTariffName(null);
      setDurationDays(null);
      setExpired(false);
      setIsDemo(false);
      setIsLifetime(false);
      setLimits([]);
    }
  }, [providerSubscription, subscription]);

  useEffect(() => {
    if (tariffLimits && tariffLimits.length > 0) setLimits(tariffLimits);
  }, [tariffLimits]);

  const effectiveSubscription = providerSubscription ?? subscription;
  const tariffId = effectiveSubscription?.subscription?.tariffs?.id ?? effectiveSubscription?.subscription?.tariff_id ?? null;
  const { data: limitsFetched } = useQuery({
    queryKey: ['tariffLimits', tariffId],
    queryFn: async () => {
      if (!tariffId) return [] as { limit_name: string; value: number; id?: number }[];
      const res = await TariffService.getTariffLimits(Number(tariffId));
      return res || [];
    },
    enabled: !!tariffId,
    staleTime: 900_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev as { limit_name: string; value: number; id?: number }[] | undefined,
  });
  useEffect(() => {
    if ((!tariffLimits || tariffLimits.length === 0) && limitsFetched) {
      setLimits(limitsFetched);
    }
  }, [limitsFetched, tariffLimits]);
  
  return <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Subscription Alert */}
      {tariffName ? !expired ? <Alert className="relative rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 w-fit border-emerald-200 bg-emerald-50 text-emerald-900">
            <AlertCircle />
            <AlertTitle className="col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight">
              {isDemo ? `${t('demo_trial_title_prefix')} ${durationDays ?? 7}${t('demo_trial_title_suffix')}` : t('active_tariff_title')}
            </AlertTitle>
            <AlertDescription className="col-start-2 grid justify-items-start gap-2 text-sm [&_p]:leading-relaxed">
              {isDemo ? <p>{t('demo_trial_desc')}</p> : null}
              {!isDemo && <div className="flex items-center gap-2">
                  {isLifetime ? <Crown className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  <span><strong>{tariffName}</strong>{endDate ? ` — ${t('end_date')}: ${new Date(endDate).toLocaleDateString()}` : ''}</span>
                </div>}
              <ul className="list-inside list-disc text-sm">
                {limits.map(l => (
                  <li key={l.id ?? `${l.limit_name}`}>{l.limit_name} - {l.value}</li>
                ))}
              </ul>
              
            </AlertDescription>
          </Alert> : <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <AlertTitle>
              {t('subscription_expired') || 'Ваш тариф закончился'}
            </AlertTitle>
            <AlertDescription>
              <span>
                {t('please_select_new_tariff') || 'Пожалуйста, выберите новый тариф, чтобы продолжить работу.'}
              </span>
            </AlertDescription>
          </Alert> : null}

      {/* Dashboard Grid */}
      

      {/* Recent Activity Section */}
      

      {/* Settings Quick Access */}
      

      {/* Additional Content for Scroll Testing */}
      

      {/* More content to ensure scrolling */}
      {[1, 2, 3].map(section => (
        <div key={section}></div>
      ))}
    </div>;
};
export default UserDashboard;