import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ShopsList, ShopForm } from '@/components/user/shops';
import { ShopService, type Shop, type ShopLimitInfo } from '@/lib/shop-service';
import { toast } from 'sonner';

type ViewMode = 'list' | 'create' | 'edit';

export const Shops = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [shopsCount, setShopsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [limitInfo, setLimitInfo] = useState<ShopLimitInfo>({ current: 0, max: 0, canCreate: false });

  useEffect(() => {
    loadMaxLimit();
  }, []);

  const loadMaxLimit = async () => {
    try {
      const maxLimit = await ShopService.getShopLimitOnly();
      setLimitInfo(prev => ({
        ...prev,
        max: maxLimit,
        canCreate: prev.current < maxLimit
      }));
    } catch (error: any) {
      console.error('Load max limit error:', error);
    }
  };

  const handleShopsLoaded = (count: number) => {
    setShopsCount(count);
    setLimitInfo(prev => ({
      ...prev,
      current: count,
      canCreate: count < prev.max
    }));
  };

  const handleEdit = (shop: Shop) => {
    setSelectedShop(shop);
    setViewMode('edit');
  };

  const handleCreateNew = () => {
    if (!limitInfo.canCreate) {
      toast.error(t('shops_limit_reached') + '. ' + t('upgrade_plan'));
      return;
    }
    setSelectedShop(null);
    setViewMode('create');
  };

  const handleBackToList = () => {
    setSelectedShop(null);
    setViewMode('list');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await ShopService.deleteShop(id);
      toast.success(t('shop_deleted'));
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_shop'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={
          viewMode === 'list' 
            ? t('shops_title') 
            : viewMode === 'create' 
            ? t('create_shop') 
            : t('edit_shop')
        }
        description={
          viewMode === 'list' 
            ? t('shops_description') 
            : viewMode === 'create'
            ? t('create_shop_description')
            : t('edit_shop_description')
        }
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            {viewMode === 'list' && (
              <>
                <Badge variant="outline" className="text-sm">
                  {t('shops_limit')}: {limitInfo.current} / {limitInfo.max}
                </Badge>
                {shopsCount > 0 && (
                  <Button 
                    onClick={handleCreateNew}
                    disabled={!limitInfo.canCreate}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('add_shop')}
                  </Button>
                )}
              </>
            )}
            {viewMode !== 'list' && (
              <Button variant="ghost" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_shops')}
              </Button>
            )}
          </div>
        }
      />

      {viewMode === 'list' && (
        <ShopsList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
          onShopsLoaded={handleShopsLoaded}
          refreshTrigger={refreshTrigger}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <ShopForm
          shop={selectedShop}
          onSuccess={handleBackToList}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
};
