import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Store, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/i18n';
import { ShopsList, ShopForm } from '@/components/user/shops';
import { ShopService, type ShopLimitInfo } from '@/lib/shop-service';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SessionValidator } from '@/lib/session-validation';

type ViewMode = 'list' | 'create';

export const Shops = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [shopsCount, setShopsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [limitInfo, setLimitInfo] = useState<ShopLimitInfo>({ current: 0, max: 0, canCreate: false });
  const queryClient = useQueryClient();

  const handleShopsLoaded = (count: number, info?: ShopLimitInfo | null) => {
    setShopsCount(count);
    if (info) {
      setLimitInfo(info);
      return;
    }
    setLimitInfo((prev) => ({
      ...prev,
      current: count,
      canCreate: count < prev.max,
    }));
  };

  useEffect(() => {
    (async () => {
      try {
        const v = await SessionValidator.validateSession();
        const userId = String(v?.user?.id || '');
        if (!userId) return;
        const channel = supabase
          .channel(`shop_limit_${userId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${userId}` }, () => {
            queryClient.invalidateQueries({ queryKey: ['shopsList'] });
          })
          .subscribe();
        return () => { try { supabase.removeChannel(channel); } catch { void 0; } };
      } catch { /* noop */ }
    })();
  }, [queryClient]);

  // No forced refresh on mount; React Query in ShopsList handles initial fetch
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
                    setRefreshTrigger(prev => prev + 1);
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {shopsCount > 0 && (
                  <Button 
                    onClick={handleCreateNew}
                    disabled={!limitInfo.canCreate}
                    variant="ghost"
                    size="icon"
                    title={t('add_shop')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            {viewMode !== 'list' && (
              <Button variant="ghost" onClick={handleBackToList} className="group inline-flex items-center gap-2 hover:bg-transparent focus-visible:bg-transparent active:bg-transparent">
                <span className="inline sm:hidden">{t('back_to_shops')}</span>
                <span className="inline-flex items-center justify-center rounded-full bg-transparent border border-border text-foreground w-8 h-8 transition-colors group-hover:border-emerald-500 group-hover:text-emerald-600 group-active:scale-95 group-active:shadow-inner">
                  <ArrowLeft className="h-4 w-4" />
                </span>
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
