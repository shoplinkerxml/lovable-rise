import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Edit, Settings, Share2, Package, List, Store as StoreIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ProductsTable } from '@/components/user/products/ProductsTable';
import { EditShopDialog, ShopStructureEditor } from '@/components/user/shops';
import { ExportDialog } from '@/components/user/shops/ExportDialog';
import { ProgressiveLoader, FullPageLoader } from '@/components/LoadingSkeletons';

import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop, type ShopAggregated } from '@/lib/shop-service';
import { ProductService, type Product } from '@/lib/product-service';
import { supabase } from '@/integrations/supabase/client';

export const ShopDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();

  // UI states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Counts state (обновляется локально для быстрого UI)
  const [localCounts, setLocalCounts] = useState<{
    products: number;
    categories: number;
  } | null>(null);

  // Redirect if no ID
  useEffect(() => {
    if (!id) {
      navigate('/user/shops');
    }
  }, [id, navigate]);

  // Fetch shop data with React Query
  const {
    data: shop,
    isLoading,
    isError,
  } = useQuery<Shop | null>({
    queryKey: ['shopDetail', id],
    queryFn: async () => {
      if (!id) return null;
      return await ShopService.getShop(id);
    },
    enabled: !!id,
    staleTime: 900_000, // 15 минут
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Fetch counts separately (нормализовано)
  const { data: counts } = useQuery({
    queryKey: ['shopCounts', id],
    queryFn: async () => {
      if (!id) return { productsCount: 0, categoriesCount: 0 };
      const [productsCount, categoryNames] = await Promise.all([
        ShopService.getStoreProductsCount(id),
        ProductService.getStoreCategoryFilterOptions(id),
      ]);
      return { productsCount, categoriesCount: Array.isArray(categoryNames) ? categoryNames.length : 0 };
    },
    enabled: !!id && !!shop,
    staleTime: 60_000, // 1 минута (счетчики меняются чаще)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Используем локальные или серверные счетчики (нормализуем формат)
  const displayCounts = localCounts
    ? { productsCount: localCounts.products, categoriesCount: localCounts.categories }
    : (counts || { productsCount: 0, categoriesCount: 0 });

  // Realtime subscription для обновления магазина
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`shop_detail_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stores',
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shopDetail', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => void 0);
    };
  }, [id, queryClient]);

  // Refresh counts when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0 && id) {
      queryClient.invalidateQueries({ queryKey: ['shopCounts', id] });
    }
  }, [refreshTrigger, id, queryClient]);

  // Мемоизация breadcrumbs
  const shopBreadcrumbs = useMemo(() => {
    const marketplace = shop?.marketplace ? String(shop.marketplace) : '';
    const label = marketplace || shop?.store_name || t('loading') || 'Завантаження...';
    
    return [
      ...breadcrumbs,
      {
        label,
        current: true,
      },
    ];
  }, [breadcrumbs, shop?.marketplace, shop?.store_name, t]);

  // Обработчик удаления продукта
  const handleDeleteProduct = useCallback(
    async (product: Product) => {
      if (!id) return;

      try {
        const { categoryNamesByStore } = await ProductService.bulkRemoveStoreProductLinks(
          [String(product.id)],
          [id]
        );

        // Обновляем локальные счетчики для мгновенного отклика UI
        const categoryNames = categoryNamesByStore?.[id] || [];
        setLocalCounts((prev) => ({
          products: Math.max(0, (prev?.products || displayCounts.productsCount) - 1),
          categories: categoryNames.length,
        }));

        // Обновляем кэш списка магазинов
        queryClient.setQueryData<ShopAggregated[]>(['shopsList'], (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((s) =>
            String(s.id) === id
              ? {
                  ...s,
                  productsCount: Math.max(0, s.productsCount - 1),
                  categoriesCount: categoryNames.length,
                }
              : s
          );
        });

        // Инвалидируем запрос счетчиков для получения точных данных
        queryClient.invalidateQueries({ queryKey: ['shopCounts', id] });

        // Триггер обновления таблицы
        setRefreshTrigger((prev) => prev + 1);

        toast.success(t('product_removed_successfully') || 'Товар видалено');
      } catch (error) {
        console.error('[ShopDetail] Delete product error:', error);
        toast.error(t('failed_remove_from_store') || 'Помилка видалення товару');
      }
    },
    [id, displayCounts, queryClient, t]
  );

  // Обработчик загрузки продуктов (обновляет счетчик)
  const handleProductsLoaded = useCallback(
    (count: number) => {
      if (!id) return;
      
      setLocalCounts((prev) => ({
        products: count,
        categories: prev?.categories || displayCounts.categoriesCount,
      }));

      // Обновляем кэш списка магазинов
      queryClient.setQueryData<ShopAggregated[]>(['shopsList'], (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((s) =>
          String(s.id) === id ? { ...s, productsCount: count } : s
        );
      });
    },
    [id, displayCounts.categoriesCount, queryClient]
  );

  // Обработчик успешного редактирования
  const handleEditSuccess = useCallback(() => {
    if (!id) return;
    queryClient.invalidateQueries({ queryKey: ['shopDetail', id] });
  }, [id, queryClient]);

  // Loading state
  if (isLoading) {
    return (
      <ProgressiveLoader
        isLoading={true}
        delay={250}
        fallback={
          <FullPageLoader
            title={t('loading_shop') || 'Завантаження магазину…'}
            subtitle={t('loading_shop_subtitle') || 'Готуємо панель керування та список товарів'}
            icon={StoreIcon}
          />
        }
      >
        <div />
      </ProgressiveLoader>
    );
  }

  // Error state or shop not found
  if (isError || !shop) {
    return (
      <div className="p-6">
        <Empty className="border max-w-lg mx-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>
              {t('shop_not_found') || 'Магазин не знайдено'}
            </EmptyTitle>
            <EmptyDescription>
              {t('shop_not_found_description') ||
                'Перевірте посилання або поверніться до списку магазинів.'}
            </EmptyDescription>
          </EmptyHeader>
          <div className="mt-4 flex justify-center">
            <Button variant="default" onClick={() => navigate('/user/shops')}>
              {t('go_to_shops') || 'До магазинів'}
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  // Main content
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={shop.store_name}
        description={`${t('managing_shop') || 'Управління магазином'} ${shop.store_name}`}
        breadcrumbItems={shopBreadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            {/* Counts badges */}
            <div className="flex items-center gap-2 mr-1">
              <span className="inline-flex items-center gap-1 text-xs border rounded-md px-3 py-1">
                <Package className="h-3 w-3" />
                <span>{displayCounts.productsCount}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs border rounded-md px-3 py-1">
                <List className="h-3 w-3" />
                <span>{displayCounts.categoriesCount}</span>
              </span>
            </div>

            {/* Action buttons */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/user/shops/${id}/settings`)}
              title={t('breadcrumb_settings') || 'Налаштування'}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowStructureEditor(true)}
              title={t('xml_structure') || 'Структура XML'}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowExportDialog(true)}
              title={t('export_section') || 'Експорт'}
              data-testid="user_shop_export_open"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Products table */}
      <div className="bg-background border rounded-md">
        <ProductsTable
          storeId={id}
          onEdit={(product: Product) =>
            navigate(`/user/shops/${id}/products/edit/${product.id}`)
          }
          onDelete={handleDeleteProduct}
          onProductsLoaded={handleProductsLoaded}
          refreshTrigger={refreshTrigger}
          canCreate={true}
          hideDuplicate={true}
        />
      </div>

      {/* Dialogs */}
      <EditShopDialog
        shop={shop}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
      />

      <ShopStructureEditor
        shop={shop}
        open={showStructureEditor}
        onOpenChange={setShowStructureEditor}
        onSuccess={handleEditSuccess}
      />

      <ExportDialog
        storeId={id!}
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
};
