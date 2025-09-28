import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TariffService, type TariffWithDetails } from '@/lib/tariff-service';
import { toast } from 'sonner';
import { CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';

const TariffPage = () => {
  const { t } = useI18n();
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
      toast.error('Failed to load tariffs');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null, currency: { code: string; rate: number } | undefined) => {
    if (price === null || price === undefined) return 'Free';
    const currencyCode = currency?.code || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
  };

  const formatDuration = (days: number | null) => {
    if (days === null || days === undefined) return 'Lifetime';
    if (days === 30) return 'Monthly';
    if (days === 365) return 'Yearly';
    return `${days} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('choose_your_plan')}</h1>
        <p className="text-muted-foreground">
          {t('select_perfect_plan_for_your_needs')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tariffs.map((tariff) => (
          <Card key={tariff.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{tariff.name}</CardTitle>
                  <p className="text-muted-foreground mt-2">{tariff.description}</p>
                </div>
                {tariff.is_free && (
                  <Badge variant="secondary">{t('free')}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-6">
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

              <Separator className="my-6" />

              <div className="space-y-4">
                <h3 className="font-semibold">{t('tariff_page_features')}</h3>
                <ul className="space-y-2">
                  {tariff.features.map((feature) => (
                    <li key={feature.id} className="flex items-center">
                      {feature.is_active ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <span>{feature.feature_name}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-4" />

                <h3 className="font-semibold">{t('tariff_page_limits')}</h3>
                <ul className="space-y-2">
                  {tariff.limits.map((limit) => (
                    <li key={limit.id} className="flex justify-between">
                      <span>{limit.limit_name}:</span>
                      <span className="font-medium">{limit.value}</span>
                    </li>
                  ))}
                </ul>
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