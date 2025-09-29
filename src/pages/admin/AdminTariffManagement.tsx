import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Copy, MoreHorizontal, CreditCard, Star, Crown, Package } from 'lucide-react';
import { TariffService, type Tariff, type TariffInsert, type Currency } from '@/lib/tariff-service';
import { useI18n } from '@/providers/i18n-provider';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs, usePageInfo } from '@/hooks/useBreadcrumbs';

const AdminTariffManagement = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const pageInfo = usePageInfo();
  
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [formData, setFormData] = useState<Partial<TariffInsert>>({
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
    fetchTariffs();
    fetchCurrencies();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      const tariffData = await TariffService.getAllTariffs(true);
      setTariffs(tariffData);
    } catch (error) {
      console.error('Error fetching tariffs:', error);
      toast.error('Failed to load tariffs');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const currencyData = await TariffService.getAllCurrencies();
      setCurrencies(currencyData);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast.error('Failed to load currencies');
    }
  };

  const handleCreate = async () => {
    try {
      await TariffService.createTariff(formData as TariffInsert);
      toast.success('Tariff created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchTariffs();
    } catch (error) {
      console.error('Error creating tariff:', error);
      toast.error('Failed to create tariff');
    }
  };

  const handleUpdate = async () => {
    if (!editingTariff) return;
    
    try {
      await TariffService.updateTariff(editingTariff.id, formData);
      toast.success('Tariff updated successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchTariffs();
    } catch (error) {
      console.error('Error updating tariff:', error);
      toast.error('Failed to update tariff');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this tariff?')) return;
    
    try {
      await TariffService.deleteTariff(id);
      toast.success('Tariff deleted successfully');
      fetchTariffs();
    } catch (error) {
      console.error('Error deleting tariff:', error);
      toast.error('Failed to delete tariff');
    }
  };

  const handleDuplicate = async (tariff: Tariff) => {
    try {
      const duplicateData: TariffInsert = {
        name: `${tariff.name} (Copy)`,
        description: tariff.description,
        old_price: tariff.old_price,
        new_price: tariff.new_price,
        currency: tariff.currency,
        duration_days: tariff.duration_days,
        is_free: tariff.is_free,
        is_lifetime: tariff.is_lifetime,
        is_active: false // New duplicates are inactive by default
      };
      
      await TariffService.createTariff(duplicateData);
      toast.success('Tariff duplicated successfully');
      fetchTariffs();
    } catch (error) {
      console.error('Error duplicating tariff:', error);
      toast.error('Failed to duplicate tariff');
    }
  };

  const resetForm = () => {
    setFormData({
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
    setEditingTariff(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setFormData({
      name: tariff.name,
      description: tariff.description,
      old_price: tariff.old_price,
      new_price: tariff.new_price,
      currency: tariff.currency,
      duration_days: tariff.duration_days,
      is_free: tariff.is_free,
      is_lifetime: tariff.is_lifetime,
      is_active: tariff.is_active
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTariff) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const handleChange = (field: keyof TariffInsert, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCurrencySymbol = (currencyId: number) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.code : 'USD';
  };

  const getTariffIcon = (tariff: Tariff) => {
    if (tariff.is_free) return <Package className="h-5 w-5 text-blue-500" />;
    if (tariff.is_lifetime) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (tariff.new_price && tariff.new_price > 100) return <Star className="h-5 w-5 text-purple-500" />;
    return <CreditCard className="h-5 w-5 text-green-500" />;
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
      {/* Page Header with Breadcrumbs */}
      <PageHeader
        title={pageInfo.title}
        description={t('manage_tariffs_and_pricing_options')}
        breadcrumbItems={breadcrumbs}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {t('add_new_tariff')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTariff ? t('edit_tariff') : t('create_new_tariff')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('tariff_name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">{t('currency')}</Label>
                    <Select
                      value={formData.currency?.toString() || '1'}
                      onValueChange={(value) => handleChange('currency', parseInt(value))}
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
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="old_price">{t('old_price')}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol(formData.currency || 1)}
                      </span>
                      <Input
                        id="old_price"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-12"
                        value={formData.old_price || ''}
                        onChange={(e) => handleChange('old_price', e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_price">{t('new_price')}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol(formData.currency || 1)}
                      </span>
                      <Input
                        id="new_price"
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-12"
                        value={formData.new_price || ''}
                        onChange={(e) => handleChange('new_price', e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration_days">{t('duration_days')}</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      min="0"
                      value={formData.duration_days || ''}
                      onChange={(e) => handleChange('duration_days', e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_free"
                      checked={formData.is_free || false}
                      onCheckedChange={(checked) => handleChange('is_free', checked)}
                    />
                    <Label htmlFor="is_free">{t('free_plan')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_lifetime"
                      checked={formData.is_lifetime || false}
                      onCheckedChange={(checked) => handleChange('is_lifetime', checked)}
                    />
                    <Label htmlFor="is_lifetime">{t('lifetime')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active || false}
                      onCheckedChange={(checked) => handleChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active">{t('active')}</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    {t('cancel_tariff')}
                  </Button>
                  <Button type="submit">
                    {editingTariff ? t('update_tariff') : t('create_tariff')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Tariff Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>{t('tariff_name')}</TableHead>
                <TableHead>{t('tariff_price')}</TableHead>
                <TableHead>{t('tariff_term')}</TableHead>
                <TableHead>{t('tariff_status')}</TableHead>
                <TableHead className="text-right">{t('tariff_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.map((tariff) => (
                <TableRow key={tariff.id}>
                  <TableCell>{getTariffIcon(tariff)}</TableCell>
                  <TableCell className="font-medium">{tariff.name}</TableCell>
                  <TableCell>
                    {tariff.is_free ? (
                      <Badge variant="secondary">{t('free_tariff')}</Badge>
                    ) : (
                      <div>
                        {tariff.new_price !== null ? (
                          <span>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: currencies.find(c => c.id === tariff.currency)?.code || 'USD',
                            }).format(tariff.new_price)}
                            {tariff.old_price && tariff.old_price > tariff.new_price && (
                              <span className="ml-2 text-muted-foreground line-through text-sm">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: currencies.find(c => c.id === tariff.currency)?.code || 'USD',
                                }).format(tariff.old_price)}
                              </span>
                            )}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {tariff.is_lifetime ? t('lifetime_tariff') : 
                     tariff.duration_days ? `${tariff.duration_days} ${t('days_tariff')}` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tariff.is_active ? 'default' : 'secondary'} className={tariff.is_active ? 'badge-active' : ''}>
                      {tariff.is_active ? t('status_active') : t('status_inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => openEditDialog(tariff)}
                          className="dropdown-item-hover"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          <span>{t('edit_tariff')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(tariff.id)}
                          className="dropdown-item-hover"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>{t('delete_tariff')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDuplicate(tariff)}
                          className="dropdown-item-hover"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          <span>{t('duplicate_tariff')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTariffManagement;