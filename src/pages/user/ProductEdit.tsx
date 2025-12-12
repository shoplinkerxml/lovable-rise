import { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { ContentSkeleton, ProgressiveLoader, FullPageLoader } from "@/components/LoadingSkeletons";
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ProductFormTabs } from '@/components/ProductFormTabs';
import { ProductService, type Product, type ProductParam, type ProductAggregated } from '@/lib/product-service';
import { CategoryService } from '@/lib/category-service';
import { ShopService } from '@/lib/shop-service';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const ProductEdit = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryName, setCategoryName] = useState<string>('');
  const [imagesLoading, setImagesLoading] = useState<boolean>(false);
  const aggSuppliersRef = useRef<Array<{ id: string; supplier_name: string }> | undefined>(undefined);
  const aggCurrenciesRef = useRef<Array<{ id: number; name: string; code: string; status: boolean | null }> | undefined>(undefined);
  const aggCategoriesRef = useRef<Array<{ id: string; name: string; external_id: string; supplier_id: string; parent_external_id: string | null }> | undefined>(undefined);
  const aggSupplierCategoriesMapRef = useRef<Record<string, Array<{ id: string; name: string; external_id: string; supplier_id: string; parent_external_id: string | null }>> | undefined>(undefined);
  const preloadedImagesRef = useRef<Array<{ id?: string; url: string; order_index: number; is_main: boolean; alt_text?: string }> | undefined>(undefined);
  const preloadedParamsRef = useRef<Array<{ id?: string; name: string; value: string; order_index: number; paramid?: string; valueid?: string }> | undefined>(undefined);

  useEffect(() => {
    const loadProductAgg = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const agg = await ProductService.getProductEditData(id);
        setProduct(agg.product);
        preloadedImagesRef.current = (agg.images || []) as Array<{ id?: string; url: string; order_index: number; is_main: boolean; alt_text?: string }>;
        preloadedParamsRef.current = (agg.params || []) as Array<{ id?: string; name: string; value: string; order_index: number; paramid?: string; valueid?: string }>;
        aggSuppliersRef.current = agg.suppliers;
        aggCurrenciesRef.current = agg.currencies;
        aggCategoriesRef.current = agg.categories;
        aggSupplierCategoriesMapRef.current = agg.supplierCategoriesMap;
        if (agg.categoryName) setCategoryName(agg.categoryName);
      } catch (error) {
        console.error('Failed to load product:', error);
        toast.error(t('failed_load_products'));
      } finally {
        setLoading(false);
      }
    };
    loadProductAgg();
  }, [id, t]);

  useEffect(() => {
    if (categoryName) return;
    const loadCategoryName = async () => {
      if (!product) return;
      try {
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
  }, [product, categoryName]);

  const handleCancel = () => {
    navigate('/user/products');
  };

  type FormDataInput = {
    external_id: string;
    category_id?: number | string | null;
    category_external_id?: string | null;
    supplier_id?: number | string | null;
    currency_code?: string | null;
    name: string;
    name_ua?: string | null;
    docket?: string | null;
    docket_ua?: string | null;
    vendor?: string | null;
    article?: string | null;
    available?: boolean;
    stock_quantity?: number | string;
    price?: number;
    price_old?: number;
    price_promo?: number;
    description?: string | null;
    description_ua?: string | null;
    state?: string;
  };
  const handleFormSubmit = async ({ formData, images, parameters }: { formData: FormDataInput; images: Array<{ url: string; order_index: number; is_main: boolean; object_key?: string }>; parameters: ProductParam[] }) => {
    if (!id) return;
    try {
      const payload: any = {
        external_id: formData.external_id,
        category_id: formData.category_id || null,
        category_external_id: formData.category_external_id ? String(formData.category_external_id) : undefined,
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
      };
      const mappedImages = (images || []).map((img, index: number) => ({
        url: img.url,
        order_index: typeof img.order_index === 'number' ? img.order_index : index,
        is_main: !!img.is_main,
        object_key: img.object_key
      }));
      if (mappedImages.length > 0) payload.images = mappedImages;
      await ProductService.updateProduct(id, payload);
      try {
        const cidNum = formData.category_id ? Number(formData.category_id) : null;
        let catName = '';
        if (cidNum != null) {
          const list = aggCategoriesRef.current || [];
          const found = list.find((c) => String(c.id) === String(cidNum));
          catName = found?.name || '';
        } else if (formData.supplier_id && formData.category_external_id) {
          const map = aggSupplierCategoriesMapRef.current || {};
          const arr = map[String(formData.supplier_id)] || [];
          const found = arr.find((c) => String(c.external_id) === String(formData.category_external_id));
          catName = found?.name || '';
        }
        const patch: Partial<Product> = {
          name: formData.name,
          name_ua: formData.name_ua || null,
          vendor: formData.vendor || null,
          article: formData.article || null,
          price: typeof formData.price === 'number' ? formData.price : null,
          price_old: typeof formData.price_old === 'number' ? formData.price_old : null,
          price_promo: typeof formData.price_promo === 'number' ? formData.price_promo : null,
          available: !!formData.available,
          stock_quantity: Number(formData.stock_quantity) || 0,
          category_id: cidNum ?? null,
          category_external_id: formData.category_external_id || null,
        };
        ProductService.patchProductCaches(String(id), { ...(patch as Partial<ProductAggregated>), categoryName: catName || undefined });
        queryClient.setQueryData(['products', 'all'], (prev: ProductAggregated[] | undefined) => {
          const arr = prev || [];
          return arr.map((p) => String(p.id) === String(id)
            ? { ...p, ...(patch as Partial<ProductAggregated>), categoryName: catName || p.categoryName }
            : p);
        });
        if (cidNum != null || patch.category_external_id != null) {
          try {
            const linked = await ProductService.getStoreLinksForProduct(String(id));
            const namesByStore = await ProductService.refreshStoreCategoryFilterOptions(linked);
            for (const sid of linked) {
              const names = Array.isArray(namesByStore?.[String(sid)]) ? namesByStore![String(sid)] : [];
              ShopService.setCategoriesCountInCache(String(sid), names.length);
            }
            queryClient.setQueryData(['shopsList'], (prev: any) => {
              const arr = Array.isArray(prev) ? prev : [];
              return arr.map((s: any) => {
                const names = Array.isArray(namesByStore?.[String(s.id)]) ? namesByStore![String(s.id)] : undefined;
                if (!names) return s;
                return { ...s, categoriesCount: names.length };
              });
            });
          } catch { /* ignore */ }
        }
      } catch { void 0; }
      toast.success(t('product_updated'));
      navigate('/user/products');
    } catch {
      toast.error(t('failed_save_product'));
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
        actions={
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="shrink-0 group inline-flex items-center p-0 hover:bg-transparent focus-visible:bg-transparent active:bg-transparent"
              data-testid="header_back_button"
              title={t('back_to_products')}
            >
              <span className="inline-flex items-center justify-center rounded-full bg-transparent border border-border text-foreground w-7 h-7 transition-colors group-hover:border-emerald-500 group-hover:text-emerald-600 group-active:scale-95 group-active:shadow-inner">
                <ArrowLeft className="h-4 w-4" />
              </span>
            </Button>
          </div>
        }
      />

      <ProgressiveLoader
        isLoading={loading}
        delay={150}
        fallback={
          <FullPageLoader
            title="Завантаження товару…"
            subtitle="Готуємо форму редагування, дані та зображення"
            icon={Package}
          />
        }
      >
        <div className="relative min-h-[clamp(12rem,50vh,24rem)]" aria-busy={loading}>
          <ProductFormTabs
            product={product || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleCancel}
            onImagesLoadingChange={setImagesLoading}
            preloadedImages={preloadedImagesRef.current}
            preloadedParams={preloadedParamsRef.current}
            preloadedSuppliers={aggSuppliersRef.current}
            preloadedCurrencies={aggCurrenciesRef.current}
            preloadedCategories={aggCategoriesRef.current}
            preloadedSupplierCategoriesMap={aggSupplierCategoriesMapRef.current}
          />
        </div>
      </ProgressiveLoader>
    </div>
  );
};

export default ProductEdit;
