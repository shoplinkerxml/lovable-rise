import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ProductsList, ProductForm } from '@/components/user/products';
import { ProductService, type Product, type ProductLimitInfo } from '@/lib/product-service';
import { toast } from 'sonner';

type ViewMode = 'list' | 'create' | 'edit';

export const Products = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productsCount, setProductsCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [limitInfo, setLimitInfo] = useState<ProductLimitInfo>({ current: 0, max: 0, canCreate: false });

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
    setSelectedProduct(product);
    setViewMode('edit');
  };

  const handleCreateNew = () => {
    if (!limitInfo.canCreate) {
      toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
      return;
    }
    setSelectedProduct(null);
    setViewMode('create');
  };

  const handleBackToList = () => {
    setSelectedProduct(null);
    setViewMode('list');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await ProductService.deleteProduct(id);
      toast.success(t('product_deleted'));
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_product'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={
          viewMode === 'list' 
            ? t('products_title') 
            : viewMode === 'create' 
            ? t('create_product') 
            : t('edit_product')
        }
        description={
          viewMode === 'list' 
            ? t('products_description') 
            : viewMode === 'create'
            ? t('create_product_description')
            : t('edit_product_description')
        }
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            {viewMode === 'list' && (
              <>
                <Badge variant="outline" className="text-sm flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  <span>{limitInfo.current} / {limitInfo.max}</span>
                </Badge>
                {productsCount > 0 && (
                  <Button 
                    onClick={handleCreateNew}
                    disabled={!limitInfo.canCreate}
                    size="icon"
                    title={t('add_product')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            {viewMode !== 'list' && (
              <Button variant="ghost" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_products')}
              </Button>
            )}
          </div>
        }
      />

      {viewMode === 'list' && (
        <ProductsList
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
          onProductsLoaded={handleProductsLoaded}
          refreshTrigger={refreshTrigger}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <ProductForm
          product={selectedProduct}
          onSuccess={handleBackToList}
          onCancel={handleBackToList}
        />
      )}
    </div>
  );
};
