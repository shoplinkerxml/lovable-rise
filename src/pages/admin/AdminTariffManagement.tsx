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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Copy, MoreHorizontal, CreditCard, Star, Crown, Package, AlertTriangle, DollarSign, PoundSterling, JapaneseYen } from 'lucide-react';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tariffToDelete, setTariffToDelete] = useState<Tariff | null>(null);

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

  const handleDelete = async (tariff: Tariff) => {
    setTariffToDelete(tariff);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!tariffToDelete) return;
    
    try {
      await TariffService.deleteTariff(tariffToDelete.id);
      toast.success(t('tariff_deleted_successfully'));
      fetchTariffs();
    } catch (error) {
      console.error('Error deleting tariff:', error);
      toast.error(t('failed_to_delete_tariff'));
    } finally {
      setDeleteDialogOpen(false);
      setTariffToDelete(null);
    }
  };

  const handleDuplicate = async (tariff: Tariff) => {
    try {
      await TariffService.duplicateTariff(tariff.id);
      toast.success(t('tariff_duplicated_successfully'));
      fetchTariffs();
    } catch (error) {
      console.error('Error duplicating tariff:', error);
      toast.error(t('failed_to_duplicate_tariff'));
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

  // Function to get currency symbol based on currency code
  // Uses actual currency symbols for better visual consistency
  const getCurrencySymbol = (currencyCode: string | undefined) => {
    if (!currencyCode) return <span className="text-base font-semibold">$</span>;
    
    switch (currencyCode.toUpperCase()) {
      case 'USD':
        return <span className="text-base font-semibold">$</span>;
      case 'EUR':
        return <span className="text-base font-semibold">€</span>;
      case 'GBP':
        return <span className="text-base font-semibold">£</span>;
      case 'JPY':
        return <span className="text-base font-semibold">¥</span>;
      case 'UAH':
        return <span className="text-base font-semibold">₴</span>;
      default:
        return <span className="text-base font-semibold">$</span>; // Default to dollar sign
    }
  };

  const formatPrice = (price: number | null, currencyCode: string | undefined) => {
    if (price === null || price === undefined) return 'N/A';
    const code = currencyCode || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(price).replace(/^[^\d]*/, '');
  };

  // Function to get tariff icon based on tariff properties
  const getTariffIcon = (tariff: Tariff) => {
    if (tariff.is_free) return <Package className="h-5 w-5 text-blue-500" />;
    if (tariff.is_lifetime) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (tariff.new_price && tariff.new_price > 50) return <Star className="h-5 w-5 text-purple-500" />;
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
                <TableHead className="text-center">{t('tariff_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tariffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('no_tariffs_found')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tariffs.map((tariff) => (
                  <TableRow key={tariff.id}>
                    <TableCell>{getTariffIcon(tariff)}</TableCell>
                    <TableCell className="font-medium">{tariff.name}</TableCell>
                    <TableCell>
                      {tariff.is_free ? (
                        <Badge variant="secondary">{t('free_tariff')}</Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          {getCurrencySymbol(currencies.find(c => c.id === tariff.currency)?.code)}
                          <span>
                            {tariff.new_price !== null ? (
                              <span>
                                {formatPrice(tariff.new_price, currencies.find(c => c.id === tariff.currency)?.code)}
                                {tariff.old_price && tariff.old_price > tariff.new_price && (
                                  <span className="ml-2 text-muted-foreground line-through text-sm">
                                    {formatPrice(tariff.old_price, currencies.find(c => c.id === tariff.currency)?.code)}
                                  </span>
                                )}
                              </span>
                            ) : (
                              'N/A'
                            )}
                          </span>
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
                    <TableCell className="text-center">
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
                            onClick={() => handleDelete(tariff)}
                            className="dropdown-item-hover text-red-600 focus:text-red-600"
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold">
                  {t('confirm_delete_tariff')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-600 mt-1">
                  {t('delete_tariff_warning')}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          {tariffToDelete && (
            <div className="my-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3">
                {getTariffIcon(tariffToDelete)}
                <div>
                  <h4 className="font-medium text-gray-900">{tariffToDelete.name}</h4>
                  <p className="text-sm text-gray-600">
                    {tariffToDelete.description || t('no_description')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {tariffToDelete.is_free ? (
                      <Badge variant="secondary" className="text-xs">{t('free_tariff')}</Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        {getCurrencySymbol(currencies.find(c => c.id === tariffToDelete.currency)?.code)}
                        <span className="text-xs text-gray-500">
                          {tariffToDelete.new_price !== null ? (
                            formatPrice(tariffToDelete.new_price, currencies.find(c => c.id === tariffToDelete.currency)?.code)
                          ) : 'N/A'}
                        </span>
                      </div>
                    )}
                    <Badge variant={tariffToDelete.is_active ? 'default' : 'secondary'} className="text-xs">
                      {tariffToDelete.is_active ? t('status_active') : t('status_inactive')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 text-gray-700 hover:bg-gray-50">
              {t('cancel_tariff')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('delete_tariff')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTariffManagement;