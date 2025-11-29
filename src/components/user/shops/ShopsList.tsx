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

  const { data: shopsData, isLoading, isFetching } = useQuery<ShopWithMarketplace[]>({
    queryKey: ['shopsList'],
    queryFn: async () => {
      const rows = await ShopService.getShopsAggregated();
      return rows as ShopWithMarketplace[];
    },
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const shops: ShopWithMarketplace[] = shopsData ?? [];
  const onShopsLoadedRef = useRef(onShopsLoaded);
  useEffect(() => { onShopsLoadedRef.current = onShopsLoaded; }, [onShopsLoaded]);
  useEffect(() => { onShopsLoadedRef.current?.(shops.length); }, [shops.length]);
  useEffect(() => {
    if ((refreshTrigger ?? 0) > 0) {
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
    }
  }, [refreshTrigger, queryClient]);
  useEffect(() => {
    let debounceTimer: number | null = null;
    const scheduleInvalidate = () => {
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['shopsList'] });
        debounceTimer = null;
      }, 150);
    };

    const ch = (supabase as SupabaseClient)
      .channel('shops_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_product_links' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_products' }, scheduleInvalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_store_categories' }, scheduleInvalidate)
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {showSkeletons && Array.from({ length: 6 }).map((_, idx) => (
          <Card key={`skeleton_${idx}`} className="hover:shadow-none">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-5 w-40 mt-2" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog({ open: true, shop })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
