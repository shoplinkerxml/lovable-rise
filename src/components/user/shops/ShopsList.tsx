import { useState, useEffect, useRef } from 'react';
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
import { Store, Edit, Trash2, Package, List } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type ShopAggregated } from '@/lib/shop-service';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { FullPageLoader } from '@/components/LoadingSkeletons';
import { ProductService } from '@/lib/product-service';

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
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; shop: ShopWithMarketplace | null }>({
    open: false,
    shop: null
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: shopsData, isLoading, isFetching } = useQuery<ShopWithMarketplace[]>({
    queryKey: ['shopsList'],
    queryFn: async () => {
      const rows = await ShopService.getShopsAggregated();
      return rows as ShopWithMarketplace[];
    },
    retry: false,
    staleTime: 2_592_000_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const shops: ShopWithMarketplace[] = shopsData ?? [];
  const onShopsLoadedRef = useRef(onShopsLoaded);
  useEffect(() => { onShopsLoadedRef.current = onShopsLoaded; }, [onShopsLoaded]);
  useEffect(() => { onShopsLoadedRef.current?.(shops.length); }, [shops.length]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = String(data?.user?.id || "");
        setCurrentUserId(uid || null);
      } catch { setCurrentUserId(null); }
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const arr = Array.isArray(shopsData) ? shopsData : [];
        const suspicious = arr
          .filter((s) => (Number(s.productsCount) || 0) > 0 && (Number(s.categoriesCount) || 0) === 0)
          .map((s) => String(s.id))
          .filter(Boolean);
        if (suspicious.length === 0) return;
        const toFetch = suspicious.filter((sid) => {
          try {
            const raw = typeof window !== 'undefined' ? window.localStorage.getItem(`rq:filters:categories:${sid}`) : null;
            if (!raw) return true;
            const parsed = JSON.parse(raw);
            const items = Array.isArray((parsed as any)?.items) ? (parsed as any).items : (Array.isArray(parsed) ? parsed : []);
            return !(Array.isArray(items) && items.length > 0);
          } catch { return true; }
        });
        if (toFetch.length === 0) return;
        const results = await ProductService.refreshStoreCategoryFilterOptions(toFetch);
        queryClient.setQueryData<ShopWithMarketplace[]>(['shopsList'], (prev) => {
          const arrPrev = Array.isArray(prev) ? prev : [];
          return arrPrev.map((x) => {
            const names = Array.isArray(results[String(x.id)]) ? results[String(x.id)] : undefined;
            if (!names) return x as ShopWithMarketplace;
            return { ...x, categoriesCount: names.length } as ShopWithMarketplace;
          });
        });
      } catch { /* ignore */ }
    })();
  }, [shopsData, queryClient]);
  useEffect(() => {
    if ((refreshTrigger ?? 0) > 0) {
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
    }
  }, [refreshTrigger, queryClient]);
  const refetchDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    const mutateCounts = (storeId: string, deltaProducts: number) => {
      try {
        queryClient.setQueryData<ShopWithMarketplace[]>(['shopsList'], (prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.map((s) => {
            if (String(s.id) !== String(storeId)) return s;
            const nextProducts = Math.max(0, (s.productsCount ?? 0) + (deltaProducts || 0));
            const nextCategories = nextProducts === 0 ? 0 : (s.categoriesCount ?? 0);
            return { ...s, productsCount: nextProducts, categoriesCount: nextCategories } as ShopWithMarketplace;
          });
        });
        (async () => {
          try {
            const arr = queryClient.getQueryData<ShopWithMarketplace[]>(['shopsList']) || [];
            const exists = arr.some((s) => String(s.id) === String(storeId));
            if (!exists) return;
            const raw = typeof window !== 'undefined' ? window.localStorage.getItem(`rq:filters:categories:${storeId}`) : null;
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                const items = Array.isArray((parsed as any)?.items) ? (parsed as any).items : (Array.isArray(parsed) ? parsed : []);
                const cnt = Array.isArray(items) ? items.length : 0;
                queryClient.setQueryData<ShopWithMarketplace[]>(['shopsList'], (prev) => {
                  const arrPrev = Array.isArray(prev) ? prev : [];
                  return arrPrev.map((s) => String(s.id) === String(storeId) ? { ...s, categoriesCount: cnt } : s);
                });
                return;
              } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
        })();
        if (refetchDebounceRef.current != null) window.clearTimeout(refetchDebounceRef.current);
        refetchDebounceRef.current = window.setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['shopsList'], exact: false });
          refetchDebounceRef.current = null;
        }, 750);
      } catch { /* ignore */ }
    };

    const ch = (supabase as SupabaseClient)
      .channel('shops_realtime')
      // Stores table → invalidate for structural changes
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stores' }, () => {
        queryClient.invalidateQueries({ queryKey: ['shopsList'] });
      })
      // Product links → adjust productsCount fast and guard categories when 0
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'store_product_links' }, (payload: any) => {
        const row = payload?.new || {};
        const active = row?.is_active !== false;
        const sid = row?.store_id ? String(row.store_id) : '';
        if (sid && active) mutateCounts(sid, +1);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'store_product_links' }, (payload: any) => {
        const row = payload?.old || {};
        const active = row?.is_active !== false;
        const sid = row?.store_id ? String(row.store_id) : '';
        if (sid && active) mutateCounts(sid, -1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_product_links' }, (payload: any) => {
        const oldRow = payload?.old || {};
        const newRow = payload?.new || {};
        const sidOld = oldRow?.store_id ? String(oldRow.store_id) : '';
        const sidNew = newRow?.store_id ? String(newRow.store_id) : '';
        const wasActive = oldRow?.is_active !== false;
        const isActive = newRow?.is_active !== false;
        if (sidOld && sidNew && sidOld !== sidNew) {
          if (wasActive) mutateCounts(sidOld, -1);
          if (isActive) mutateCounts(sidNew, +1);
        } else if (sidNew) {
          if (wasActive && !isActive) mutateCounts(sidNew, -1);
          if (!wasActive && isActive) mutateCounts(sidNew, +1);
        }
      })
      .subscribe();
    return () => { try { (supabase as SupabaseClient).removeChannel(ch); } catch { void 0; } };
  }, [queryClient]);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.shop) return;

    try {
      await onDelete?.(deleteDialog.shop.id);
      setDeleteDialog({ open: false, shop: null });
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
    } catch (error: unknown) {
      const message = typeof (error as { message?: string }).message === 'string' ? (error as { message?: string }).message : '';
      toast.error(message || t('failed_delete_shop'));
    }
  };

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
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/user/shops/${shop.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Store className="h-8 w-8 text-emerald-600" />
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {currentUserId && String(shop.user_id) === String(currentUserId) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteDialog({ open: true, shop })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
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
              <div className="flex items-center gap-4 text-sm" data-testid={`user_shop_item_stats_${shop.id}`}>
                <div className="flex items-center gap-1" data-testid={`user_shop_item_products_${shop.id}`}>
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('shop_products')}:</span>
                  <span className="font-medium">{shop.productsCount ?? 0}</span>
                </div>
                <div className="flex items-center gap-1" data-testid={`user_shop_item_categories_${shop.id}`}>
                  <List className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('shop_categories')}:</span>
                  <span className="font-medium">{(shop.productsCount ?? 0) === 0 ? 0 : (shop.categoriesCount ?? 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, shop: null })}>
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
