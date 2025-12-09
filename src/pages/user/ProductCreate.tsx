import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ProductFormTabs } from '@/components/ProductFormTabs';
import { ProductService, type ProductLimitInfo, type ProductImage, type ProductParam } from '@/lib/product-service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const ProductCreate = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [limitInfo, setLimitInfo] = useState<ProductLimitInfo>({ current: 0, max: 0, canCreate: false });

  useEffect(() => {
    (async () => {
      try {
        const info = await ProductService.getProductLimit();
        setLimitInfo(info);
        if (!info.canCreate) {
          toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
        }
      } catch {
        setLimitInfo({ current: 0, max: 0, canCreate: false });
        toast.error(t('failed_load_limit'));
      }
    })();
  }, [t]);

  // Убрана страничная очистка временных загрузок, чтобы не путаться

  const loadLimitInfo = async () => {
    try {
      const info = await ProductService.getProductLimit();
      setLimitInfo(info);
      if (!info.canCreate) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
      }
    } catch {
      setLimitInfo({ current: 0, max: 0, canCreate: false });
      toast.error(t('failed_load_limit'));
    }
  };

  const handleSuccess = () => {
    toast.success(t('product_created'));
    navigate('/user/products');
  };

  const handleCancel = () => {
    navigate('/user/products');
  };

  // Восстанавливаем старый интерфейс: onSubmit получает formData, images, parameters
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
  const handleFormSubmit = async ({ formData, images, parameters }: { formData: FormDataInput; images: (ProductImage & { object_key?: string })[]; parameters: ProductParam[] }) => {
    try {
      await ProductService.createProduct({
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
        images: (images || []).map((img, index: number) => ({
          url: img.url,
          order_index: typeof img.order_index === 'number' ? img.order_index : index,
          is_main: !!img.is_main
        }))
      });
      toast.success(t('product_created'));
      navigate('/user/products');
    } catch {
      toast.error(t('failed_create_product'));
    }
  };

  return (
    <div className="px-2 sm:px-6 py-3 sm:py-6 space-y-6" data-testid="product_create_page">
      <PageHeader
        title={t('create_product')}
        description={t('create_product_description')}
        breadcrumbItems={breadcrumbs}
        className="pl-6"
        actions={
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="text-sm flex items-center gap-1.5 shrink-0">
              <Package className="h-4 w-4" />
              <span>{limitInfo.current} / {limitInfo.max}</span>
            </Badge>
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="shrink-0 group inline-flex items-center gap-2 hover:bg-transparent focus-visible:bg-transparent active:bg-transparent"
              data-testid="header_back_button"
              title={t('back_to_products')}
            >
              <span className="inline sm:hidden">{t('back_to_products')}</span>
              <span className="inline-flex items-center justify-center rounded-full bg-transparent border border-border text-foreground w-8 h-8 transition-colors group-hover:border-emerald-500 group-hover:text-emerald-600 group-active:scale-95 group-active:shadow-inner">
                <ArrowLeft className="h-4 w-4" />
              </span>
            </Button>
          </div>
        }
      />

      <ProductFormTabs
        product={undefined}
        onSubmit={handleFormSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};
