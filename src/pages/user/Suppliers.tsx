import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { SuppliersList } from '@/components/user/suppliers';
import { SupplierForm } from '@/components/user/suppliers';
import { SupplierService, type Supplier } from '@/lib/supplier-service';
import { toast } from 'sonner';

type ViewMode = 'list' | 'create' | 'edit';

export const Suppliers = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setViewMode('edit');
  };

  const handleCreateNew = () => {
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
          <div className="flex gap-2">
            {viewMode !== 'list' && (
              <Button variant="ghost" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_suppliers')}
              </Button>
            )}
            {viewMode === 'list' && suppliersCount > 0 && (
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add_supplier')}
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
          onSuppliersLoaded={setSuppliersCount}
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
