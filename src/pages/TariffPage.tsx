import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TariffService, type TariffWithDetails } from '@/lib/tariff-service';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Plus, 
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
  Mail,
  Phone,
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
  User
} from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs, usePageInfo } from '@/hooks/useBreadcrumbs';

const TariffPage = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const pageInfo = usePageInfo();
  
  const [tariffs, setTariffs] = useState<TariffWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      const tariffData = await TariffService.getAllTariffs();
      setTariffs(tariffData);
    } catch (error) {
      console.error('Error fetching tariffs:', error);
      toast.error(t('failed_load_currencies'));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null, currency: { code: string; rate: number } | undefined) => {
    if (price === null || price === undefined) return t('free_tariff');
    const currencyCode = currency?.code || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
  };

  const formatDuration = (days: number | null) => {
    if (days === null || days === undefined) return t('lifetime_tariff');
    if (days === 30) return t('pricing_period_monthly');
    if (days === 365) return t('pricing_period_yearly');
    return `${days} ${t('days_tariff')}`;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
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
        {tariffs.map((tariff) => (
          <Card key={tariff.id} className="flex flex-col">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-semibold flex items-center gap-2">
                    {tariff.is_free ? (
                      <Zap className="h-6 w-6 text-blue-500" />
                    ) : tariff.is_lifetime ? (
                      <Crown className="h-6 w-6 text-yellow-500" />
                    ) : tariff.new_price && tariff.new_price > 50 ? (
                      <Star className="h-6 w-6 text-purple-500" />
                    ) : (
                      <CreditCard className="h-6 w-6 text-green-500" />
                    )}
                    {tariff.name}
                  </h3>
                  <p className="text-muted-foreground mt-2">{tariff.description}</p>
                </div>
                {tariff.is_free ? (
                  <Badge variant="secondary">{t('free_tariff')}</Badge>
                ) : (
                  <Badge variant={tariff.is_active ? 'default' : 'secondary'} className={tariff.is_active ? 'badge-active' : ''}>
                    {tariff.is_active ? t('status_active') : t('status_inactive')}
                  </Badge>
                )}
              </div>
              
              <div className="my-6">
                <div className="text-3xl font-bold">
                  {formatPrice(tariff.new_price, tariff.currency_data)}
                  {tariff.old_price && tariff.new_price && tariff.old_price > tariff.new_price && (
                    <span className="text-lg text-muted-foreground line-through ml-2">
                      {formatPrice(tariff.old_price, tariff.currency_data)}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {formatDuration(tariff.duration_days)}
                </p>
              </div>

              <div className="space-y-6">
                {/* Main Info Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-5 w-5 text-blue-500" />
                    <h4 className="font-semibold">{t('basic_information')}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('tariff_price')}:</span>
                      <span className="font-medium">
                        {tariff.is_free ? t('free_tariff') : formatPrice(tariff.new_price, tariff.currency_data)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('tariff_term')}:</span>
                      <span className="font-medium">{formatDuration(tariff.duration_days)}</span>
                    </div>
                    {tariff.currency_data && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('currency')}:</span>
                        <span className="font-medium">{tariff.currency_data.code}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('features')}:</span>
                      <span className="font-medium">{tariff.features.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('limits')}:</span>
                      <span className="font-medium">{tariff.limits.length}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Features Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold">{t('tariff_page_features')}</h4>
                  </div>
                  <div className="space-y-2">
                    {tariff.features.length > 0 ? (
                      tariff.features.map((feature) => {
                        const IconComponent = getFeatureIcon(feature.feature_name);
                        return (
                          <div key={feature.id} className="flex items-start justify-between py-1">
                            <div className="flex items-start gap-2">
                              {feature.is_active ? (
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                              )}
                              <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className={feature.is_active ? "" : "text-muted-foreground line-through"}>
                                {feature.feature_name}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-muted-foreground text-sm">{t('no_features_configured')}</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Limits Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-5 w-5 text-purple-500" />
                    <h4 className="font-semibold">{t('tariff_page_limits')}</h4>
                  </div>
                  <div className="space-y-2">
                    {tariff.limits.length > 0 ? (
                      tariff.limits.map((limit) => {
                        const IconComponent = getLimitIcon(limit.limit_name);
                        return (
                          <div key={limit.id} className="flex items-start justify-between py-1">
                            <div className="flex items-start gap-2">
                              <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span>{limit.limit_name}</span>
                            </div>
                            <span className="font-medium bg-muted px-2 py-0.5 rounded text-sm">
                              {limit.value}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-muted-foreground text-sm">{t('no_limits_configured')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button className="w-full" size="lg">
                  <CreditCard className="mr-2 h-5 w-5" />
                  {t('select_plan')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TariffPage;