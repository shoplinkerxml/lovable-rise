import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Truck, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/i18n';
import { SuppliersList } from '@/components/user/suppliers';
import { SupplierForm } from '@/components/user/suppliers';
import { SupplierService, type Supplier, type SupplierLimitInfo } from '@/lib/supplier-service';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';

type ViewMode = 'list' | 'create' | 'edit';

export const Suppliers = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [limitInfo, setLimitInfo] = useState<SupplierLimitInfo>({ current: 0, max: 0, canCreate: false });

  const { tariffLimits } = useOutletContext<{ tariffLimits: Array<{ limit_name: string; value: number }> }>();
  useEffect(() => {
    const supplierLimit = (tariffLimits || [])
      .find((l) => {
        const n = String(l.limit_name || '').toLowerCase();
        return n.includes('постач') || n.includes('supplier');
      })?.value ?? 0;
    setLimitInfo(prev => ({ ...prev, max: supplierLimit, canCreate: prev.current < supplierLimit }));
  }, [tariffLimits]);

  const handleSuppliersLoaded = useCallback((count: number) => {
    (async () => {
      const cachedCount = await SupplierService.getSuppliersCountCached();
      setSuppliersCount(cachedCount);
      setLimitInfo(prev => ({
        ...prev,
        current: cachedCount,
        canCreate: cachedCount < prev.max,
      }));
    })();
  }, []);

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

  const handleDelete = async (id: number) => {
    try {
      await SupplierService.deleteSupplier(id);
      toast.success(t('supplier_deleted'));
      setRefreshTrigger(prev => prev + 1);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message || t('failed_delete_supplier'));
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
                <Button 
                  variant="ghost"
                  size="icon"
                  title={t('refresh') || 'Оновити'}
                  onClick={() => {
                    try {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('rq:suppliers:list');
                      }
                    } catch (_e) { void 0; }
                    setRefreshTrigger(prev => prev + 1);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
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
