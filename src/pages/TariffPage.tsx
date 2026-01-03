import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TariffService, type TariffWithDetails } from "@/lib/tariff-service";
import { UserAuthService } from "@/lib/user-auth-service";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  Info,
  Zap,
  Shield,
  Database,
  Users,
  Cloud,
  HardDrive,
  Clock,
  Lock,
  Globe,
  BarChart3,
  FileText,
  Headphones,
  Upload,
  Download,
  RefreshCw,
  Settings,
  TrendingUp,
  Award,
  Star,
  Crown,
  Folder,
  Code,
  Store,
  Truck,
  Package,
  User,
  Rocket,
  Banknote,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { PageHeader } from "@/components/PageHeader";
import { useOutletContext } from "react-router-dom";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { FullPageLoader } from "@/components/LoadingSkeletons";

const TariffPage = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  
  
  const [activeTariffId, setActiveTariffId] = useState<number | null>(null);

  const { data: tariffsData, isLoading } = useQuery<TariffWithDetails[]>({
    queryKey: ["tariffs", "list"],
    queryFn: async () => {
      return await TariffService.getTariffsAggregated(false);
    },
    retry: false,
    staleTime: 900_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev as TariffWithDetails[] | undefined,
  });

  const normalizedTariffs: TariffWithDetails[] = Array.isArray(tariffsData) ? tariffsData : [];
  const visibleTariffs: TariffWithDetails[] = normalizedTariffs.filter((t) => {
    const name = String(t.name || '').toLowerCase();
    return !(name.includes('демо') || name.includes('demo'));
  });

  type SubscriptionEntity = { tariff_id?: number; end_date?: string | null; is_active?: boolean | null };
  const { subscription: subscriptionCtx } = useOutletContext<{ subscription: { hasValidSubscription: boolean; subscription: SubscriptionEntity | null; isDemo: boolean } | null }>();
  useEffect(() => {
    const sub = subscriptionCtx?.subscription || null;
    const valid = !!sub && sub.is_active !== false;
    setActiveTariffId(valid ? (sub?.tariff_id ?? null) : null);
  }, [subscriptionCtx?.subscription]);

  

  

  // Function to get relevant icon for a tariff based on price and sort order
  const getTariffIcon = (tariff: TariffWithDetails, allTariffs: TariffWithDetails[] | undefined) => {
    if (tariff.is_free) {
      return <Zap className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    
    if (tariff.is_lifetime) {
      return <Crown className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    
    const paidTariffs = (allTariffs ?? []).filter(t => !t.is_free && t.new_price !== null) as TariffWithDetails[];
    
    if (paidTariffs.length <= 1) {
      return <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    
    const sortedTariffs = [...paidTariffs].sort((a, b) => {
      const priceA = a.new_price || 0;
      const priceB = b.new_price || 0;
      return priceA - priceB;
    });
    
    const currentIndex = sortedTariffs.findIndex(t => t.id === tariff.id);
    
    if (currentIndex === -1) {
      return <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
    
    const tier = currentIndex / sortedTariffs.length;
    
    if (tier < 0.33) {
      return <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />;
    } else if (tier < 0.66) {
      return <Banknote className="h-5 w-5 sm:h-6 sm:w-6" />;
    } else {
      return <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
  };

  // Function to get relevant icon for a feature
  const getFeatureIcon = (featureName: string) => {
    const name = featureName.toLowerCase();
    
    if (name.includes('проект') || name.includes('project')) return Folder;
    if (name.includes('аналитик') || name.includes('analytic')) return BarChart3;
    if (name.includes('поддержк') || name.includes('support')) return Headphones;
    if (name.includes('api')) return Code;
    if (name.includes('домен') || name.includes('domain')) return Globe;
    if (name.includes('команд') || name.includes('team')) return Users;
    if (name.includes('резерв') || name.includes('backup')) return Database;
    if (name.includes('sla')) return Shield;
    if (name.includes('обновлени') || name.includes('update')) return RefreshCw;
    if (name.includes('настро') || name.includes('setting')) return Settings;
    if (name.includes('загрузк') || name.includes('upload')) return Upload;
    if (name.includes('экспорт') || name.includes('export')) return Download;
    if (name.includes('отчет') || name.includes('report')) return FileText;
    if (name.includes('реклам') || name.includes('ad')) return TrendingUp;
    if (name.includes('премиум') || name.includes('premium')) return Award;
    
    return Zap;
  };

  // Function to get relevant icon for a limit
  const getLimitIcon = (limitName: string) => {
    const name = limitName.toLowerCase();
    
    if (name.includes('хранилищ') || name.includes('storage')) return HardDrive;
    if (name.includes('команд') || name.includes('team')) return Users;
    if (name.includes('магазин') || name.includes('store')) return Store;
    if (name.includes('поставщик') || name.includes('supplier')) return Truck;
    if (name.includes('товар') || name.includes('product')) return Package;
    if (name.includes('запрос') || name.includes('request')) return Cloud;
    if (name.includes('врем') || name.includes('time')) return Clock;
    if (name.includes('безопасн') || name.includes('security')) return Lock;
    if (name.includes('пользовател') || name.includes('user')) return User;
    
    return Info;
  };

  if (isLoading) {
    return (
      <FullPageLoader
        title="Завантаження тарифів…"
        subtitle={t("choose_your_plan_description")}
        icon={CreditCard}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('menu_pricing')}
        description={t('choose_your_plan_description')}
        breadcrumbItems={breadcrumbs}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(visibleTariffs.length === 0) ? (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-muted-foreground">
            {t('no_tariffs_found')}
          </div>
        ) : visibleTariffs.map((tariff: TariffWithDetails) => {
          const isPopular = tariff.popular === true;
          return (
            <Card 
              key={tariff.id} 
              className={`card-elevated card-elevated-hover flex flex-col relative overflow-hidden ${
                isPopular ? 'border-2 border-primary' : ''
              } ${activeTariffId === tariff.id ? 'border-emerald-500 ring-2 ring-emerald-200' : ''}`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1.5 rounded-bl-lg flex items-center gap-1.5 shadow-lg">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-xs font-bold tracking-wide">Popular</span>
                </div>
              )}
              
              <CardContent className="p-6 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {getTariffIcon(tariff, visibleTariffs)}
                      <h3 className="text-2xl font-bold">
                        {tariff.name}
                      </h3>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {tariff.description}
                    </p>
                  </div>
                </div>

                {/* Pricing Section - Reorganized */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  {tariff.old_price && tariff.new_price && tariff.old_price > tariff.new_price && tariff.currency_data ? (
                    <>
                      {/* Old Price */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg text-muted-foreground line-through flex items-baseline gap-1">
                          <span className="text-base">
                            {tariff.currency_data?.code === 'USD' ? '$' : 
                             tariff.currency_data?.code === 'EUR' ? '€' : 
                             tariff.currency_data?.code === 'GBP' ? '£' : 
                             tariff.currency_data?.code === 'JPY' ? '¥' : 
                             tariff.currency_data?.code === 'UAH' ? '₴' : '$'}
                          </span>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: tariff.currency_data.code,
                          }).format(tariff.old_price).replace(/^[^\d]*/, '')}
                        </span>
                      </div>
                      
                      {/* Discount Badge */}
                      <div className="mb-3">
                        <Badge variant="destructive" className="text-xs font-semibold">
                          -{Math.round(((tariff.old_price - tariff.new_price) / tariff.old_price) * 100)}% {t('discount')}
                        </Badge>
                      </div>
                    </>
                  ) : null}
                  
                  {/* New Price */}
                  <div className="flex flex-wrap items-baseline gap-1 mb-1">
                    <span className="text-2xl sm:text-3xl font-bold" style={{ color: '#069668' }}>
                      {tariff.currency_data?.code === 'USD' ? '$' : 
                       tariff.currency_data?.code === 'EUR' ? '€' : 
                       tariff.currency_data?.code === 'GBP' ? '£' : 
                       tariff.currency_data?.code === 'JPY' ? '¥' : 
                       tariff.currency_data?.code === 'UAH' ? '₴' : '$'}
                    </span>
                    {tariff.new_price !== null && tariff.currency_data ? (
                      <>
                        <span className="text-3xl sm:text-4xl font-bold" style={{ color: '#069668' }}>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: tariff.currency_data.code,
                          }).format(tariff.new_price).replace(/^[^\d]*/, '')}
                        </span>
                        {!tariff.is_lifetime && !tariff.is_free && (
                          <span className="text-sm sm:text-base text-muted-foreground ml-1">
                            {t('per_month')}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-3xl sm:text-4xl font-bold" style={{ color: '#069668' }}>
                        {t('free_tariff')}
                      </span>
                    )}
                  </div>
                  
                  {/* Lifetime Badge */}
                  {tariff.is_lifetime && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Crown className="h-3 w-3 mr-1" />
                        {t('lifetime_tariff')}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Features & Limits */}
                <div className="space-y-4 flex-grow">
                  {/* Features Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" />
                      {t('features') || 'Features'}
                    </h4>
                    <div className="space-y-2">
                      {tariff.features.length > 0 ? (
                        tariff.features.slice(0, 5).map((feature: TariffWithDetails['features'][number]) => {
                          const IconComponent = getFeatureIcon(feature.feature_name);
                          return (
                            <div key={feature.id} className="flex items-start gap-2">
                              {feature.is_active ? (
                                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              )}
                              <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className={`text-sm ${feature.is_active ? "" : "text-muted-foreground line-through"}`}>
                                {feature.feature_name}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground text-xs">{t('no_features_configured')}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Limits Section */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      {t('limits') || 'Limits'}
                    </h4>
                    <div className="space-y-2">
                      {tariff.limits.length > 0 ? (
                        tariff.limits.map((limit: TariffWithDetails['limits'][number]) => {
                          const IconComponent = getLimitIcon(limit.limit_name);
                          return (
                            <div key={limit.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">{limit.limit_name}</span>
                              </div>
                              <Badge variant="outline" className="font-semibold">
                                {limit.value}
                              </Badge>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground text-xs">{t('no_limits_configured')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Select Plan Button */}
                <div className="mt-6 space-y-4">
                  <Button 
                    className={`w-full ${isPopular ? 'bg-primary hover:bg-primary/90 shadow-lg' : ''}`}
                    size="lg"
                    variant={isPopular ? "default" : "outline"}
                    disabled={activeTariffId === tariff.id}
                    onClick={async () => {
                      try {
                        const resp = await TariffService.activateMyTariff(Number(tariff.id));
                        if (!resp?.success) throw new Error("failed_update_tariff");
                        UserAuthService.clearAuthMeCache();
                        setActiveTariffId(Number(tariff.id));
                        toast.success(t('tariff_updated_successfully'));
                        window.location.href = '/user/dashboard';
                      } catch (e) {
                        const msg = String((e as any)?.message || "").trim();
                        toast.error(msg && msg !== "failed_update_tariff" ? msg : t('failed_update_tariff'));
                      }
                    }}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    <span className="font-semibold">{activeTariffId === tariff.id ? t('active_tariff_button') : t('select_plan')}</span>
                  </Button>


                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TariffPage;
