import { useState, useEffect } from 'react';
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
import { Store, Edit, Trash2, Loader2, Package, List } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type ShopAggregated } from '@/lib/shop-service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

  const { data: shopsData, isLoading } = useQuery<ShopWithMarketplace[]>({
    queryKey: ['shopsList'],
    queryFn: async () => {
      const cacheKey = 'rq:shopsList';
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
        if (raw) {
          const parsed = JSON.parse(raw) as { items: ShopWithMarketplace[]; expiresAt: number };
          if (parsed && Array.isArray(parsed.items) && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
            return parsed.items;
          }
        }
      } catch {}
      const rows = await ShopService.getShopsAggregated();
      try {
        const payload = JSON.stringify({ items: rows as ShopWithMarketplace[], expiresAt: Date.now() + 900_000 });
        if (typeof window !== 'undefined') window.localStorage.setItem(cacheKey, payload);
      } catch {}
      return rows as ShopWithMarketplace[];
    },
    retry: false,
    staleTime: 900_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev as ShopWithMarketplace[] | undefined,
  });
  const shops: ShopWithMarketplace[] = shopsData ?? [];
  useEffect(() => { onShopsLoaded?.(shops.length); }, [shops.length]);
  useEffect(() => { queryClient.invalidateQueries({ queryKey: ['shopsList'] }); }, [refreshTrigger]);
  useEffect(() => {
    const channel = (supabase as any).channel('shops_realtime').on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stores' },
      () => { queryClient.invalidateQueries({ queryKey: ['shopsList'] }); }
    ).subscribe();
    return () => { try { (supabase as any).removeChannel(channel); } catch {} };
  }, [queryClient]);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.shop) return;

    try {
      await onDelete?.(deleteDialog.shop.id);
      setDeleteDialog({ open: false, shop: null });
      queryClient.invalidateQueries({ queryKey: ['shopsList'] });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_shop'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="flex justify-center">
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
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <span className="font-medium">{(shop as any).productsCount ?? 0}</span>
                </div>
                <div className="flex items-center gap-1" data-testid={`user_shop_item_categories_${shop.id}`}>
                  <List className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('shop_categories')}:</span>
                  <span className="font-medium">{(shop as any).categoriesCount ?? 0}</span>
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
