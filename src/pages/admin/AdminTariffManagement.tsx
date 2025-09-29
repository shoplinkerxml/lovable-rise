import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();
  const pageInfo = usePageInfo();
  
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleCreateSampleData = async () => {
    try {
      setLoading(true);
      await TariffService.createSampleData();
      await fetchTariffs();
      toast.success('Sample tariff data created successfully!');
    } catch (error) {
      console.error('Error creating sample data:', error);
      toast.error('Failed to create sample data');
    } finally {
      setLoading(false);
    }
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
        title={t('menu_pricing')}
        description={t('manage_tariffs_and_pricing_options')}
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2">
            {tariffs.length === 0 && (
              <Button variant="outline" onClick={handleCreateSampleData}>
                Create Sample Data
              </Button>
            )}
            <Button onClick={() => navigate('/admin/tariff/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add_new_tariff')}
            </Button>
          </div>
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
                          onClick={() => navigate(`/admin/tariff/edit/${tariff.id}`)}
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