import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { TariffService, type TariffUpdate, type Currency, type TariffFeature, type TariffLimit } from '@/lib/tariff-service';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';

interface TariffFormData {
  name: string;
  description?: string | null;
  old_price?: number | null;
  new_price?: number | null;
  currency_id: number;
  currency_code: string;
  duration_days?: number | null;
  is_free?: boolean | null;
  is_lifetime?: boolean | null;
  is_active?: boolean | null;
}

const AdminTariffEdit = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const breadcrumbs = useBreadcrumbs();
  
  const [activeTab, setActiveTab] = useState('basic');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [tariffId, setTariffId] = useState<number | null>(null);
  const [features, setFeatures] = useState<TariffFeature[]>([]);
  const [limits, setLimits] = useState<TariffLimit[]>([]);
  const [newFeature, setNewFeature] = useState({ feature_name: '', is_active: true });
  const [newLimit, setNewLimit] = useState({ limit_name: '', value: 0, is_active: true });
  const [formData, setFormData] = useState<TariffFormData>({
    name: '',
    description: '',
    old_price: null,
    new_price: null,
    currency_id: 1,
    currency_code: 'USD',
    duration_days: null,
    is_free: false,
    is_lifetime: false,
    is_active: true
  });

  useEffect(() => {
    if (id) {
      const tariffIdNum = parseInt(id);
      if (!isNaN(tariffIdNum)) {
        setTariffId(tariffIdNum);
        loadTariffData(tariffIdNum);
      } else {
        toast.error('Invalid tariff ID');
        navigate('/admin/tariff');
      }
    } else {
      toast.error('Tariff ID is required');
      navigate('/admin/tariff');
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const loadTariffData = async (id: number) => {
    try {
      setPageLoading(true);
      const tariffData = await TariffService.getTariffById(id);
      
      setFormData({
        name: tariffData.name,
        description: tariffData.description,
        old_price: tariffData.old_price,
        new_price: tariffData.new_price,
        currency_id: tariffData.currency_id,
        currency_code: tariffData.currency_code,
        duration_days: tariffData.duration_days,
        is_free: tariffData.is_free,
        is_lifetime: tariffData.is_lifetime,
        is_active: tariffData.is_active
      });
      
      setFeatures(tariffData.features || []);
      setLimits(tariffData.limits || []);
    } catch (error) {
      console.error('Error loading tariff:', error);
      toast.error(t('failed_load_tariff'));
      navigate('/admin/tariff');
    } finally {
      setPageLoading(false);
    }
  };

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
      
      if (field === 'is_free' && value === true) {
        newData.old_price = null;
        newData.new_price = null;
      }
      
      if (field === 'is_lifetime' && value === true) {
        newData.duration_days = null;
      }
      
      return newData;
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (!formData.name.trim()) {
        toast.error(t('validation_error'));
        return;
      }
      
      if (!tariffId) {
        toast.error('Tariff ID is missing');
        return;
      }
      
      const tariffData = {
        ...formData,
        name: formData.name.trim()
      };
      
      await TariffService.updateTariff(tariffId, tariffData as any);
      
      toast.success(t('tariff_updated'));
      navigate('/admin/tariff');
    } catch (error) {
      console.error('Error updating tariff:', error);
      toast.error(t('failed_update_tariff'));
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currencyId: number) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.code : 'USD';
  };

  if (pageLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{t('loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={t('update_tariff')}
        description={t('update_tariff_description')}
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
                    value={formData.currency_id.toString()}
                    onValueChange={(value) => {
                      const currencyId = parseInt(value);
                      const selectedCurrency = currencies.find(c => c.id === currencyId);
                      handleInputChange('currency_id', currencyId);
                      if (selectedCurrency) {
                        handleInputChange('currency_code', selectedCurrency.code);
                      }
                    }}
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
                      {getCurrencySymbol(formData.currency_id)}
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
                      {getCurrencySymbol(formData.currency_id)}
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
                <p className="text-muted-foreground">
                  Features management will be available in the basic tab for now.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-6 mt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Limits management will be available in the basic tab for now.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTariffEdit;