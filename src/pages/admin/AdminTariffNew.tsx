import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { TariffService, type TariffInsert, type Currency } from '@/lib/tariff-service';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

interface TariffFormData extends Omit<TariffInsert, 'currency'> {
  currency: number;
}

const AdminTariffNew = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();
  
  const [activeTab, setActiveTab] = useState('basic');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TariffFormData>({
    name: '',
    description: '',
    old_price: null,
    new_price: null,
    currency: 1,
    duration_days: null,
    is_free: false,
    is_lifetime: false,
    is_active: true
  });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const currencyData = await TariffService.getAllCurrencies();
      setCurrencies(currencyData);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast.error(t('failed_load_currencies'));
    }
  };

  const handleInputChange = (field: keyof TariffFormData, value: string | number | boolean | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Business rules
      if (field === 'is_free' && value === true) {
        // If free tariff is selected, set prices to null
        newData.old_price = null;
        newData.new_price = null;
      }
      
      if (field === 'is_lifetime' && value === true) {
        // If lifetime access is selected, set duration to null
        newData.duration_days = null;
      }
      
      return newData;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validation
      if (!formData.name.trim()) {
        toast.error(t('validation_error'));
        return;
      }
      
      const tariffData: TariffInsert = {
        ...formData,
        name: formData.name.trim()
      };
      
      await TariffService.createTariff(tariffData);
      toast.success(t('tariff_created'));
      navigate('/admin/tariff');
    } catch (error) {
      console.error('Error creating tariff:', error);
      toast.error(t('failed_create_tariff'));
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currencyId: number) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.code : 'USD';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('create_new_tariff')}
        description={t('create_tariff_description')}
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/tariff')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? t('saving') : t('save')}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('tariff_details')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{t('basic_information')}</TabsTrigger>
              <TabsTrigger value="features">{t('features')}</TabsTrigger>
              <TabsTrigger value="limits">{t('limits')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('tariff_name')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('enter_tariff_name')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">{t('currency')}</Label>
                  <Select
                    value={formData.currency.toString()}
                    onValueChange={(value) => handleInputChange('currency', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id.toString()}>
                          {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('enter_tariff_description')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="old_price">{t('old_price')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(formData.currency)}
                    </span>
                    <Input
                      id="old_price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-12"
                      value={formData.old_price || ''}
                      onChange={(e) => handleInputChange('old_price', e.target.value ? parseFloat(e.target.value) : null)}
                      disabled={formData.is_free}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_price">{t('new_price')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      {getCurrencySymbol(formData.currency)}
                    </span>
                    <Input
                      id="new_price"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-12"
                      value={formData.new_price || ''}
                      onChange={(e) => handleInputChange('new_price', e.target.value ? parseFloat(e.target.value) : null)}
                      disabled={formData.is_free}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_days">{t('duration_days')}</Label>
                  <Input
                    id="duration_days"
                    type="number"
                    min="1"
                    value={formData.duration_days || ''}
                    onChange={(e) => handleInputChange('duration_days', e.target.value ? parseInt(e.target.value) : null)}
                    disabled={formData.is_lifetime}
                    placeholder={t('enter_duration_days')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_free"
                    checked={formData.is_free}
                    onCheckedChange={(checked) => handleInputChange('is_free', checked)}
                  />
                  <Label htmlFor="is_free">{t('free_plan')}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_lifetime"
                    checked={formData.is_lifetime}
                    onCheckedChange={(checked) => handleInputChange('is_lifetime', checked)}
                  />
                  <Label htmlFor="is_lifetime">{t('lifetime_access')}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">{t('active')}</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-6 mt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t('features_will_be_configured_after_creating_tariff')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('save_tariff_first_to_add_features')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-6 mt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {t('limits_will_be_configured_after_creating_tariff')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('save_tariff_first_to_add_limits')}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTariffNew;