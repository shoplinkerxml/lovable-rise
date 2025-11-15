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
import { ShopService, type Shop } from '@/lib/shop-service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShopWithMarketplace extends Shop {
  marketplace?: string;
}

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
  const [shops, setShops] = useState<ShopWithMarketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; shop: ShopWithMarketplace | null }>({
    open: false,
    shop: null
  });

  useEffect(() => {
    loadShops();
  }, [refreshTrigger]);

  const loadShops = async () => {
    try {
      setLoading(true);
      const data = await ShopService.getShops();
      const storeIds = data.map((s) => s.id);
      const templateIds = Array.from(new Set(data.map((s) => s.template_id).filter((v) => !!v))) as string[];

      const templatesMap: Record<string, string> = {};
      if (templateIds.length > 0) {
        const { data: templates } = await (supabase as any)
          .from('store_templates')
          .select('id,marketplace')
          .in('id', templateIds);
        (templates || []).forEach((r: any) => {
          if (r?.id) templatesMap[String(r.id)] = r?.marketplace || 'Не вказано';
        });
      }

      const productsRes = storeIds.length > 0
        ? await (supabase as any)
            .from('store_product_links')
            .select('store_id,store_products(category_id,category_external_id)')
            .in('store_id', storeIds)
        : { data: [] };

      const rows = (productsRes.data || []) as any[];
      const productsCountMap: Record<string, number> = {};
      const categoriesMap: Record<string, Set<string>> = {};

      // Build mapping from category_id → external_id to avoid double-counting
      const categoryIdsRaw = rows
        .map((row: any) => row?.store_products?.category_id)
        .filter((v: any) => v != null && String(v).trim() !== '');
      const uniqueCategoryIds = Array.from(new Set(categoryIdsRaw.map((v: any) => String(v))));
      const idToExternal: Record<string, string> = {};
      if (uniqueCategoryIds.length > 0) {
        const { data: catMapRows } = await (supabase as any)
          .from('store_categories')
          .select('id,external_id')
          .in('id', uniqueCategoryIds);
        (catMapRows ?? []).forEach((r: any) => {
          if (r?.id && r?.external_id != null) {
            idToExternal[String(r.id)] = String(r.external_id);
          }
        });
      }

      rows.forEach((row: any) => {
        const sid = String(row.store_id);
        productsCountMap[sid] = (productsCountMap[sid] || 0) + 1;
        const catId = row?.store_products?.category_id;
        const catExt = row?.store_products?.category_external_id;
        const canonical = (() => {
          const idStr = catId != null ? String(catId).trim() : '';
          if (idStr) {
            const mapped = idToExternal[idStr];
            if (mapped) return mapped;
          }
          return catExt != null ? String(catExt) : '';
        })();
        if (!categoriesMap[sid]) categoriesMap[sid] = new Set<string>();
        if (canonical) categoriesMap[sid].add(canonical);
      });

      const result = data.map((shop) => ({
        ...shop,
        marketplace: templatesMap[String(shop.template_id)] || 'Не вказано',
        productsCount: productsCountMap[shop.id] || 0,
        categoriesCount: (categoriesMap[shop.id]?.size) || 0,
      }) as any);

      setShops(result);
      onShopsLoaded?.(result.length);
    } catch (error: any) {
      console.error('Load shops error:', error);
      toast.error(error?.message || t('failed_load_shops'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.shop) return;

    try {
      await onDelete?.(deleteDialog.shop.id);
      setDeleteDialog({ open: false, shop: null });
      loadShops();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_shop'));
    }
  };

  if (loading) {
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
