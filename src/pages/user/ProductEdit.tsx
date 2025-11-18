import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ProductFormTabs } from '@/components/ProductFormTabs';
import { ProductService, type Product } from '@/lib/product-service';
import { CategoryService } from '@/lib/category-service';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export const ProductEdit = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryName, setCategoryName] = useState<string>('');
  const [imagesLoading, setImagesLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        const p = await ProductService.getProduct(id);
        setProduct(p);
      } catch (error) {
        console.error('Failed to load product:', error);
        toast.error(t('failed_load_products'));
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id, t]);

  useEffect(() => {
    const loadCategoryName = async () => {
      if (!product) return;
      try {
        // Prefer internal category_id, fallback to supplier_id + external_id
        if (product.category_id) {
          const cat = await CategoryService.getById(product.category_id);
          setCategoryName(cat?.name || '');
          return;
        }
        if (product.supplier_id && product.category_external_id) {
          const cat = await CategoryService.getByExternalId(String(product.supplier_id), product.category_external_id);
          setCategoryName(cat?.name || '');
        }
      } catch (e) {
        setCategoryName('');
      }
    };
    loadCategoryName();
  }, [product]);

  const handleCancel = () => {
    navigate('/user/products');
  };

  const handleFormSubmit = async ({ formData, images, parameters }: any) => {
    if (!id) return;
    try {
      await ProductService.updateProduct(id, {
        external_id: formData.external_id,
        category_id: formData.category_id || null,
        category_external_id: formData.category_external_id || null,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
        currency_code: formData.currency_code || null,
        name: formData.name,
        name_ua: formData.name_ua || null,
        docket: formData.docket || null,
        docket_ua: formData.docket_ua || null,
        vendor: formData.vendor || null,
        article: formData.article || null,
        available: !!formData.available,
        stock_quantity: Number(formData.stock_quantity) || 0,
        price: typeof formData.price === 'number' ? formData.price : null,
        price_old: typeof formData.price_old === 'number' ? formData.price_old : null,
        price_promo: typeof formData.price_promo === 'number' ? formData.price_promo : null,
        description: formData.description || null,
        description_ua: formData.description_ua || null,
        state: formData.state || 'new',
        params: parameters || [],
        images: (images || []).map((img: any, index: number) => ({
          url: img.url,
          order_index: typeof img.order_index === 'number' ? img.order_index : index,
          is_main: !!img.is_main
        }))
      });
      toast.success(t('product_updated'));
      navigate('/user/products');
    } catch (error: any) {
      console.error('Error updating product:', error);
      const key = (error?.message as string) || 'failed_save_product';
      toast.error(t(key as any));
    }
  };

  const pageBreadcrumbs = [
    { label: t('breadcrumb_home'), href: '/user', current: false },
    { label: t('products_title'), href: '/user/products', current: false },
    { label: categoryName || '—', current: true }
  ];

  return (
    <div className="px-2 sm:px-6 py-3 sm:py-6 space-y-6" data-testid="product_edit_page">
      <PageHeader
        title={t('edit_product')}
        description={t('edit_product_description')}
        breadcrumbItems={pageBreadcrumbs}
        className="pl-6"
        actions={
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="shrink-0"
              data-testid="header_back_button"
              title={t('back_to_products')}
            >
              <ArrowLeft className="h-4 w-4 mr-0" />
              <span className="sr-only">{t('back_to_products')}</span>
            </Button>
          </div>
        }
      />

      <div className="relative min-h-[clamp(12rem,50vh,24rem)]" aria-busy={loading}>
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm" data-testid="product_edit_loader">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && (
          <ProductFormTabs
            product={product || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            onImagesLoadingChange={setImagesLoading}
          />
        )}
      </div>
    </div>
  );
};

export default ProductEdit;