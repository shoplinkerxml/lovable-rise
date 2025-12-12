import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Edit, Settings, Share2, Package, List } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop } from '@/lib/shop-service';
import { EditShopDialog, ShopStructureEditor } from '@/components/user/shops';
import { ExportDialog } from '@/components/user/shops/ExportDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ProductsTable } from '@/components/user/products/ProductsTable';
 
import { ProductService, type Product } from '@/lib/product-service';
import { ProgressiveLoader, FullPageLoader } from '@/components/LoadingSkeletons';
import { Store as StoreIcon } from 'lucide-react';

export const ShopDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [shop, setShop] = useState<Shop | null>(null);
  const [marketplace, setMarketplace] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [productsCount, setProductsCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [initialTableReady, setInitialTableReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  

  const { data: shopData, isLoading, isError } = useQuery<Shop | null>({
    queryKey: ['shopDetail', id!],
    queryFn: async () => {
      if (!id) return null;
      const s = await ShopService.getShop(id!);
      return s;
    },
    enabled: !!id,
    staleTime: 900_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    placeholderData: (prev) => prev as Shop | null | undefined,
  });
  useEffect(() => {
    if (!id) {
      navigate('/user/shops');
      return;
    }
    setLoading(isLoading);
    if (shopData) {
      setShop(shopData);
    } else if (!isLoading && isError) {
      setShop(null);
    }
  }, [id, isLoading, isError, shopData, navigate]);
  useEffect(() => {
    if (shopData?.marketplace) {
      setMarketplace(String(shopData.marketplace));
    }
  }, [shopData]);
  useEffect(() => {
    const channel = supabase.channel('shop_detail_realtime').on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_stores', filter: `id=eq.${id}` },
      () => queryClient.invalidateQueries({ queryKey: ['shopDetail', id!] })
    ).subscribe();
    return () => { try { supabase.removeChannel(channel); } catch { void 0; } };
  }, [id, queryClient]);

  const computeCategoriesCount = useCallback(async () => {
    try {
      if (!id) return;
      const { data } = await supabase
        .from('store_products')
        .select('category_id, category_external_id')
        .eq('store_id', String(id!));
      const keys = new Set<string>();
      for (const row of (data || [])) {
        const key = (row as any).category_id != null
          ? `cat:${String((row as any).category_id)}`
          : (row as any).category_external_id
            ? `ext:${String((row as any).category_external_id)}`
            : null;
        if (key) keys.add(key);
      }
      setCategoriesCount(keys.size);
    } catch { /* ignore */ }
  }, [id]);
  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const pCount = await ShopService.getStoreProductsCount(id!);
        setProductsCount(Number(pCount) || 0);
        await computeCategoriesCount();
      } catch { /* ignore */ }
    })();
  }, [id, computeCategoriesCount]);
  useEffect(() => {
    if (!tableLoading) computeCategoriesCount();
  }, [tableLoading, refreshTrigger, computeCategoriesCount]);
  useEffect(() => {
    if (productsCount === 0) setCategoriesCount(0);
  }, [productsCount]);

  // Add marketplace type to breadcrumbs
  const shopBreadcrumbs = [
    ...breadcrumbs,
    {
      label: marketplace || shop?.store_name || 'Loading...',
      current: true
    }
  ];

  const pageLoading = isLoading;
  return (
    <ProgressiveLoader
      isLoading={pageLoading}
      delay={250}
      fallback={
        <FullPageLoader
          title="Завантаження магазину…"
          subtitle="Готуємо панель керування та список товарів"
          icon={StoreIcon}
        />
      }
    >
    {shop ? (
    <div className="p-6 space-y-6">
      <PageHeader
        title={shop.store_name}
        description={`Управління магазином ${shop.store_name}`}
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
              onClick={() => navigate(`/user/shops/${id}/settings`)}
              title={t('breadcrumb_settings')}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowStructureEditor(true)}
              title="Структура XML"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowExportDialog(true)}
              title={t('export_section')}
              data-testid="user_shop_export_open"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Products table for this store */}
      <div className="bg-background border rounded-md">
        <ProductsTable
          storeId={id!}
          onEdit={(product: Product) => navigate(`/user/shops/${id}/products/edit/${product.id}`)}
          onDelete={async (product: Product) => {
            try {
              const { categoryNamesByStore } = await ProductService.bulkRemoveStoreProductLinks([String(product.id)], [String(id!)]);
              try {
                const names = Array.isArray(categoryNamesByStore?.[String(id!)]) ? categoryNamesByStore![String(id!)] : [];
                setCategoriesCount(names.length);
                ShopService.setCategoriesCountInCache(String(id!), names.length);
                queryClient.setQueryData(['shopsList'], (prev: any) => {
                  const arr = Array.isArray(prev) ? prev : [];
                  return arr.map((s: any) => String(s.id) === String(id!) ? { ...s, categoriesCount: names.length } : s);
                });
              } catch { /* ignore */ }
              setRefreshTrigger((p) => p + 1);
            } catch (e) {
              toast.error(t('failed_remove_from_store'));
            }
          }}
          onProductsLoaded={(count: number) => setProductsCount(count)}
          onLoadingChange={(loading: boolean) => {
            setTableLoading(loading);
            if (!loading && !initialTableReady) setInitialTableReady(true);
          }}
          refreshTrigger={refreshTrigger}
          canCreate={true}
          hideDuplicate={true}
        />
      </div>

      

      {/* Edit Shop Dialog */}
      {shop && (
        <EditShopDialog
          shop={shop}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['shopDetail', id!] })}
        />
      )}

      {/* Structure Editor Dialog */}
      {shop && (
        <ShopStructureEditor
          shop={shop}
          open={showStructureEditor}
          onOpenChange={setShowStructureEditor}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['shopDetail', id!] })}
        />
      )}

      {/* Export Dialog */}
      {shop && (
        <ExportDialog
          storeId={id!}
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
      )}
    </div>
    ) : (
      <div className="p-6">
        <Empty className="border max-w-lg mx-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon className="h-[1.5rem] w-[1.5rem]" />
            </EmptyMedia>
            <EmptyTitle>{t('shop_not_found') || 'Магазин не знайдено'}</EmptyTitle>
            <EmptyDescription>{t('shop_not_found_description') || 'Перевірте посилання або поверніться до списку магазинів.'}</EmptyDescription>
          </EmptyHeader>
          <div className="mt-4 flex justify-center">
            <Button variant="default" onClick={() => navigate('/user/shops')}>{t('go_to_shops') || 'До магазинів'}</Button>
          </div>
        </Empty>
      </div>
    )}
    </ProgressiveLoader>
  );
};
import { useQuery, useQueryClient } from '@tanstack/react-query';
