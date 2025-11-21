import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Store, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ShopsList, ShopForm } from '@/components/user/shops';
import { ShopService, type Shop, type ShopLimitInfo } from '@/lib/shop-service';
import { toast } from 'sonner';

type ViewMode = 'list' | 'create';

export const Shops = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [shopsCount, setShopsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [limitInfo, setLimitInfo] = useState<ShopLimitInfo>({ current: 0, max: 0, canCreate: false });

  const { tariffLimits } = useOutletContext<{ tariffLimits: Array<{ limit_name: string; value: number }> }>();
  useEffect(() => {
    const shopLimit = (tariffLimits || []).find((l) => String(l.limit_name || '').toLowerCase().includes('магаз'))?.value ?? 0;
    setLimitInfo((prev) => ({ ...prev, max: shopLimit, canCreate: prev.current < shopLimit }));
  }, [tariffLimits]);

  const handleShopsLoaded = (count: number) => {
    setShopsCount(count);
    setLimitInfo(prev => ({
      ...prev,
      current: count,
      canCreate: count < prev.max
    }));
  };



  const handleCreateNew = () => {
    if (!limitInfo.canCreate) {
      toast.error(t('shops_limit_reached') + '. ' + t('upgrade_plan'));
      return;
    }
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await ShopService.deleteShop(id);
      toast.success(t('shop_deleted'));
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Delete error:', error);
      const message = (error as Error)?.message || t('failed_delete_shop');
      toast.error(message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={
          viewMode === 'list' 
            ? t('shops_title') 
            : t('create_shop')
        }
        description={
          viewMode === 'list' 
            ? t('shops_description') 
            : t('create_shop_description')
        }
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            {viewMode === 'list' && (
              <>
                <Badge variant="outline" className="text-sm flex items-center gap-1.5">
                  <Store className="h-4 w-4" />
                  <span>{limitInfo.current} / {limitInfo.max}</span>
                </Badge>
                <Button 
                  variant="ghost"
                  size="icon"
                  title={t('refresh') || 'Оновити'}
                  onClick={() => {
                    try { if (typeof window !== 'undefined') window.localStorage.removeItem('rq:shopsList'); } catch {}
                    setRefreshTrigger(prev => prev + 1);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {shopsCount > 0 && (
                  <Button 
                    onClick={handleCreateNew}
                    disabled={!limitInfo.canCreate}
                    size="icon"
                    title={t('add_shop')}
                  >
                    <Plus className="h-4 w-4" />
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
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
          onShopsLoaded={handleShopsLoaded}
          refreshTrigger={refreshTrigger}
        />
      )}

      {viewMode === 'create' && (
        <ShopForm
          onSuccess={handleBackToList}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
};
