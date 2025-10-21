import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { SuppliersList } from '@/components/user/suppliers';
import { SupplierForm } from '@/components/user/suppliers';
import { SupplierService, type Supplier, type SupplierLimitInfo } from '@/lib/supplier-service';
import { toast } from 'sonner';

type ViewMode = 'list' | 'create' | 'edit';

export const Suppliers = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [limitInfo, setLimitInfo] = useState<SupplierLimitInfo>({ current: 0, max: 0, canCreate: false });

  useEffect(() => {
    loadMaxLimit();
  }, []);

  const loadMaxLimit = async () => {
    try {
      const maxLimit = await SupplierService.getSupplierLimitOnly();
      setLimitInfo(prev => ({
        ...prev,
        max: maxLimit,
        canCreate: prev.current < maxLimit
      }));
    } catch (error: any) {
      console.error('Load max limit error:', error);
    }
  };

  const handleSuppliersLoaded = (count: number) => {
    setSuppliersCount(count);
    setLimitInfo(prev => ({
      ...prev,
      current: count,
      canCreate: count < prev.max
    }));
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setViewMode('edit');
  };

  const handleCreateNew = () => {
    if (!limitInfo.canCreate) {
      toast.error(t('suppliers_limit_reached') + '. ' + t('upgrade_plan'));
      return;
    }
    setSelectedSupplier(null);
    setViewMode('create');
  };

  const handleBackToList = () => {
    setSelectedSupplier(null);
    setViewMode('list');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await SupplierService.deleteSupplier(id);
      toast.success(t('supplier_deleted'));
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_supplier'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={
          viewMode === 'list' 
            ? t('suppliers_title') 
            : viewMode === 'create' 
            ? t('create_supplier') 
            : t('edit_supplier')
        }
        description={
          viewMode === 'list' 
            ? t('suppliers_description') 
            : viewMode === 'create'
            ? t('create_supplier_description')
            : t('edit_supplier_description')
        }
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            {viewMode === 'list' && (
              <>
                <Badge variant="outline" className="text-sm flex items-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  <span>{limitInfo.current} / {limitInfo.max}</span>
                </Badge>
                {suppliersCount > 0 && (
                  <Button 
                    onClick={handleCreateNew}
                    disabled={!limitInfo.canCreate}
                    size="icon"
                    title={t('add_supplier')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            {viewMode !== 'list' && (
              <Button variant="ghost" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_suppliers')}
              </Button>
            )}
          </div>
        }
      />

      {viewMode === 'list' && (
        <SuppliersList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
          onSuppliersLoaded={handleSuppliersLoaded}
          refreshTrigger={refreshTrigger}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <SupplierForm
          supplier={selectedSupplier}
          onSuccess={handleBackToList}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
};