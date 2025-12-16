import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Store, Trash2, Package, List } from 'lucide-react';
import { useI18n } from "@/i18n";
import { ShopService, type ShopAggregated } from '@/lib/shop-service';
import { ShopCountsService } from '@/lib/shop-counts';
import { supabase } from '@/integrations/supabase/client';
import { SessionValidator } from '@/lib/session-validation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FullPageLoader } from '@/components/LoadingSkeletons';

type ShopWithMarketplace = ShopAggregated;

interface ShopsListProps {
  onDelete?: (id: string) => void;
  onCreateNew?: () => void;
  onShopsLoaded?: (count: number) => void;
  refreshTrigger?: number;
}

export const ShopsList = ({ 
  onDelete, 
  onCreateNew, 
  onShopsLoaded,
  refreshTrigger 
}: ShopsListProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; shop: ShopWithMarketplace | null }>({
    open: false,
    shop: null
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // ============================================================================
  // React Query - єдине джерело правди
  // ============================================================================
  const { data: shopsData, isLoading, isFetching } = useQuery<ShopWithMarketplace[]>({
    queryKey: ['shopsList'],
    queryFn: async () => {
      const rows = await ShopService.getShopsAggregated();
      return rows as ShopWithMarketplace[];
    },
    retry: false,
    staleTime: 900_000, // 15 хвилин
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const shops: ShopWithMarketplace[] = useMemo(
    () => shopsData ?? [],
    [shopsData]
  );
  const shopsLength = shops.length;

  // ============================================================================
  // Lifecycle hooks
  // ============================================================================
  const onShopsLoadedRef = useRef(onShopsLoaded);
  useEffect(() => { 
    onShopsLoadedRef.current = onShopsLoaded; 
  }, [onShopsLoaded]);

  useEffect(() => { 
    onShopsLoadedRef.current?.(shopsLength); 
  }, [shopsLength]);

  useEffect(() => {
    (async () => {
      try {
        const v = await SessionValidator.validateSession();
        const uid = String(v?.user?.id || "");
        setCurrentUserId(uid || null);
      } catch { 
        setCurrentUserId(null); 
      }
    })();
  }, []);
  
  // Нормализация счетчиков: если товаров 0 — категории 0
  useEffect(() => {
    try {
      queryClient.setQueryData<ShopWithMarketplace[]>(['shopsList'], (prev) => {
        const arr = Array.isArray(prev) ? prev : shops;
        return (arr || []).map((s) => {
          const products = Math.max(0, Number(s.productsCount ?? 0));
          const categories = products === 0 ? 0 : Math.max(0, Number(s.categoriesCount ?? 0));
          return { ...s, productsCount: products, categoriesCount: categories };
        });
      });
    } catch { void 0; }
  }, [shops, queryClient]);

  // Інвалідація при зміні refreshTrigger
  useEffect(() => {
    if ((refreshTrigger ?? 0) > 0) {
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
    }
  }, [refreshTrigger, queryClient]);

  // ============================================================================
  // Realtime синхронізація (оптимістичні оновлення)
  // ============================================================================
  const refetchDebounceRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Оптимістичне оновлення лічильників товарів
    const updateProductsCount = (storeId: string, delta: number) => {
      ShopCountsService.bumpProducts(queryClient, storeId, delta);

      // Через 750мс робимо повний refetch для синхронізації
      if (refetchDebounceRef.current != null) {
        window.clearTimeout(refetchDebounceRef.current);
      }
      refetchDebounceRef.current = window.setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['shopsList'], exact: false });
        refetchDebounceRef.current = null;
      }, 750);
    };

    const channel = (supabase as SupabaseClient)
      .channel('shops_realtime')
      
      // Зміни в таблиці user_stores → повна інвалідація
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_stores' 
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['shopsList'] });
      })
      
      // INSERT товару → +1 до лічильника
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'store_product_links' 
      }, (payload: any) => {
        const row = payload?.new || {};
        const active = row?.is_active !== false;
        const sid = row?.store_id ? String(row.store_id) : '';
        if (sid && active) {
          updateProductsCount(sid, +1);
        }
      })
      
      // DELETE товару → -1 від лічильника
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'store_product_links' 
      }, (payload: any) => {
        const row = payload?.old || {};
        const active = row?.is_active !== false;
        const sid = row?.store_id ? String(row.store_id) : '';
        if (sid && active) {
          updateProductsCount(sid, -1);
        }
      })
      
      // UPDATE товару → обробка переміщення між магазинами або зміни is_active
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'store_product_links' 
      }, (payload: any) => {
        const oldRow = payload?.old || {};
        const newRow = payload?.new || {};
        const sidOld = oldRow?.store_id ? String(oldRow.store_id) : '';
        const sidNew = newRow?.store_id ? String(newRow.store_id) : '';
        const wasActive = oldRow?.is_active !== false;
        const isActive = newRow?.is_active !== false;
        
        // Переміщення між магазинами
        if (sidOld && sidNew && sidOld !== sidNew) {
          if (wasActive) updateProductsCount(sidOld, -1);
          if (isActive) updateProductsCount(sidNew, +1);
        } 
        // Зміна статусу активності
        else if (sidNew) {
          if (wasActive && !isActive) updateProductsCount(sidNew, -1);
          if (!wasActive && isActive) updateProductsCount(sidNew, +1);
        }
      })
      
      .subscribe();

    return () => { 
      try { 
        (supabase as SupabaseClient).removeChannel(channel); 
      } catch { 
        void 0; 
      } 
    };
  }, [queryClient]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.shop) return;

    try {
      await onDelete?.(deleteDialog.shop.id);
      setDeleteDialog({ open: false, shop: null });
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
    } catch (error: unknown) {
      const message = typeof (error as { message?: string }).message === 'string' 
        ? (error as { message?: string }).message 
        : '';
      toast.error(message || t('failed_delete_shop'));
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  const showSkeletons = (isLoading || isFetching) && shops.length === 0;

  return (
    <>
      {showSkeletons && (
        <FullPageLoader
          title={t('shops_title')}
          subtitle={t('shops_description')}
          icon={Store}
        />
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!showSkeletons && shops.length === 0 && (
          <div className="flex justify-center col-span-full">
            <Empty className="border max-w-md">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Store />
                </EmptyMedia>
                <EmptyTitle>{t('no_shops')}</EmptyTitle>
                <EmptyDescription>
                  {t('no_shops_description')}
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={onCreateNew} className="mt-4">
                <Store className="h-4 w-4 mr-2" />
                {t('add_shop')}
              </Button>
            </Empty>
          </div>
        )}
        
        {shops.map((shop) => (
          <Card 
            key={shop.id} 
            className="card-elevated card-elevated-hover cursor-pointer"
            onClick={() => navigate(`/user/shops/${shop.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Store className="h-8 w-8 text-emerald-600" />
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {currentUserId && String(shop.user_id) === String(currentUserId) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialog({ open: true, shop })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <CardTitle className="mt-2">{shop.store_name}</CardTitle>
              <CardDescription>
                Формат: {shop.marketplace}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={shop.is_active ? "text-green-600" : "text-gray-400"}>
                  {shop.is_active ? 'Активний' : 'Неактивний'}
                </span>
              </div>
              
              <div 
                className="flex items-center gap-4 text-sm" 
                data-testid={`user_shop_item_stats_${shop.id}`}
              >
                <div 
                  className="flex items-center gap-1" 
                  data-testid={`user_shop_item_products_${shop.id}`}
                >
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('shop_products')}:</span>
                  <span className="font-medium">{shop.productsCount ?? 0}</span>
                </div>
                
                <div 
                  className="flex items-center gap-1" 
                  data-testid={`user_shop_item_categories_${shop.id}`}
                >
                  <List className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('shop_categories')}:</span>
                  <span className="font-medium">
                    {(shop.productsCount ?? 0) === 0 ? 0 : (shop.categoriesCount ?? 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, shop: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_shop_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Магазин "{deleteDialog.shop?.store_name}" буде повністю видалено з системи.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
