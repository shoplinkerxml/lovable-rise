import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Package, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ProductsTable } from '@/components/user/products';
import { ProductService, type Product, type ProductLimitInfo } from '@/lib/product-service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DialogNoOverlay, DialogNoOverlayContent, DialogNoOverlayHeader, DialogNoOverlayTitle } from '@/components/ui/dialog-no-overlay';

export const Products = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [productsCount, setProductsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [limitInfo, setLimitInfo] = useState<ProductLimitInfo>({ current: 0, max: 0, canCreate: false });
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [tableLoading, setTableLoading] = useState<boolean>(true);

  useEffect(() => {
    loadMaxLimit();
  }, []);

  const loadMaxLimit = async () => {
    try {
      const maxLimit = await ProductService.getProductLimitOnly();
      setLimitInfo(prev => ({
        ...prev,
        max: maxLimit,
        canCreate: prev.current < maxLimit
      }));
    } catch (error: any) {
      console.error('Load max limit error:', error);
    }
  };

  const handleProductsLoaded = (count: number) => {
    setProductsCount(count);
    setLimitInfo(prev => ({
      ...prev,
      current: count,
      canCreate: count < prev.max
    }));
  };

  const handleEdit = (product: Product) => {
    navigate(`/user/products/edit/${product.id}`);
  };

  const handleCreateNew = () => {
    if (!limitInfo.canCreate) {
      toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
      return;
    }
    navigate('/user/products/new-product');
  };

  const handleDelete = async (product: Product) => {
    try {
      const nameForUi = product.name_ua || product.name || product.external_id || product.id;
      setDeletingName(nameForUi);
      setIsDeleteOpen(true);
      await ProductService.deleteProduct(product.id);
      toast.success(t('product_deleted'));
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_product'));
    }
    finally {
      setIsDeleteOpen(false);
      setDeletingName(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('products_title')}
        description={t('products_description')}
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="text-sm flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              <span>{limitInfo.current} / {limitInfo.max}</span>
            </Badge>
          </div>
        }
      />

      <div className="relative" aria-busy={tableLoading}>
        {/* Page-level preloader overlay while table loads */}
        {tableLoading && (
          <div
            className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm"
            data-testid="user_products_page_loader"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <ProductsTable
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
          onProductsLoaded={handleProductsLoaded}
          onLoadingChange={setTableLoading}
          refreshTrigger={refreshTrigger}
          canCreate={limitInfo.canCreate}
        />
      </div>

      {/* Non-modal delete progress indicator */}
      <DialogNoOverlay modal={false} open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogNoOverlayContent position="top-right" variant="info" className="p-[0.75rem] w-[min(22rem,90vw)]" data-testid="user_products_delete_progress">
          <DialogNoOverlayHeader>
            <DialogNoOverlayTitle>{t('deleting_product_title')}</DialogNoOverlayTitle>
          </DialogNoOverlayHeader>
          <div className="text-sm text-muted-foreground">
            <span>{t('deleting_product')}{deletingName ? `: ${deletingName}` : ''}</span>
          </div>
        </DialogNoOverlayContent>
      </DialogNoOverlay>
    </div>
  );
};
