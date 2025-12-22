import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Edit, Settings, Share2, Package, List, Store as StoreIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ProductsTable } from '@/components/user/products/ProductsTable';
import { FullPageLoader } from '@/components/LoadingSkeletons';

import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/i18n';
import { ShopService, type ShopAggregated } from '@/lib/shop-service';
import { ProductService, type Product } from '@/lib/product-service';
import { useShopRealtimeSync } from "@/hooks/useShopRealtimeSync";
import { ShopCountsService } from "@/lib/shop-counts";

export const ShopDetail = () => {
  const { id } = useParams<{ id: string }>();
  const shopId = id ? String(id) : "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    if (!shopId) navigate('/user/shops');
  }, [shopId, navigate]);

  const { data: shop, isLoading, isError } = useQuery<ShopAggregated | null>({
    queryKey: ['shopDetail', shopId],
    queryFn: async () => (shopId ? await ShopService.getShop(shopId) : null),
    enabled: !!shopId,
    staleTime: 900_000,
  });

  useShopRealtimeSync({ 
    shopId: shopId, 
    enabled: !!shopId
  });

  const shopBreadcrumbs = useMemo(() => {
    const marketplace = shop?.marketplace ? String(shop.marketplace) : '';
    const label = marketplace || shop?.store_name || t('loading') || 'Завантаження...';
    return [...breadcrumbs, { label, current: true }];
  }, [breadcrumbs, shop?.marketplace, shop?.store_name, t]);

  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      if (!shopId) return;

      try {
        const { deletedByStore, categoryNamesByStore } = await ProductService.bulkRemoveStoreProductLinks(
          [String(product.id)],
          [shopId]
        );

        const current = queryClient.getQueryData<ShopAggregated | null>(['shopDetail', shopId]);
        const baseProductsCount = Math.max(0, Number(current?.productsCount ?? 0));
        const baseCategoriesCount = Math.max(0, Number(current?.categoriesCount ?? 0));
        const deleted = Math.max(0, Number(deletedByStore?.[String(shopId)] ?? 1) || 0);
        const nextProductsCount = Math.max(0, baseProductsCount - deleted);
        const cats = categoryNamesByStore?.[String(shopId)];
        const nextCategoriesCount =
          nextProductsCount === 0
            ? 0
            : Array.isArray(cats)
              ? cats.length
              : baseCategoriesCount;

        ShopCountsService.set(queryClient, shopId, {
          productsCount: nextProductsCount,
          categoriesCount: nextCategoriesCount,
        });
        
        toast.success(t('product_removed_successfully') || 'Товар видалено');
      } catch (error) {
        console.error('[ShopDetail] Delete error:', error);
        toast.error(t('failed_remove_from_store') || 'Помилка видалення');
      }
    },
    [shopId, queryClient, t]
  );

  if (isLoading) {
    return (
      <FullPageLoader
        title={t('loading_shop') || 'Завантаження магазину…'}
        subtitle={t('loading_shop_subtitle') || 'Готуємо панель керування'}
        icon={StoreIcon}
      />
    );
  }

  if (isError || !shop) {
    return (
      <div className="p-6">
        <Empty className="border max-w-lg mx-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>{t('shop_not_found') || 'Магазин не знайдено'}</EmptyTitle>
            <EmptyDescription>
              {t('shop_not_found_description') || 'Перевірте посилання або поверніться до списку.'}
            </EmptyDescription>
          </EmptyHeader>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate('/user/shops')}>
              {t('go_to_shops') || 'До магазинів'}
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  const productsCount = Math.max(0, Number(shop.productsCount ?? 0));
  const categoriesCount =
    productsCount === 0 ? 0 : Math.max(0, Number(shop.categoriesCount ?? 0));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={shop.store_name}
        description={`${t('managing_shop') || 'Управління магазином'} ${shop.store_name}`}
        breadcrumbItems={shopBreadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 mr-1">
              <span className="inline-flex items-center gap-1 text-xs border rounded-md px-3 py-1">
                <Package className="h-3 w-3" />
                <span>{productsCount}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs border rounded-md px-3 py-1">
                <List className="h-3 w-3" />
                <span>{categoriesCount}</span>
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/user/shops/${shopId}/settings`)}
              title={t('breadcrumb_settings') || 'Налаштування'}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/user/shops/${shopId}/structure`)}
              title={t('xml_structure') || 'Структура XML'}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/user/shops/${shopId}/export`)}
              title={t('export_section') || 'Експорт'}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="bg-background border rounded-md">
        {productsCount === 0 ? (
          <div className="p-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia className="text-primary">
                  <Package className="h-[1.5rem] w-[1.5rem]" />
                </EmptyMedia>
                <EmptyTitle>{t('no_products')}</EmptyTitle>
                <EmptyDescription>{t('no_products_description')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <ProductsTable
            storeId={shopId}
            onEdit={(product: Product) => navigate(`/user/shops/${shopId}/products/edit/${product.id}`)}
            onDelete={handleDeleteProduct}
            canCreate={true}
            hideDuplicate={true}
          />
        )}
      </div>
    </div>
  );
};
