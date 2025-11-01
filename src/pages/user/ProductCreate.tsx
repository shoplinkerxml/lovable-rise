import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ProductForm } from '@/components/user/products';
import { ProductService, type ProductLimitInfo } from '@/lib/product-service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const ProductCreate = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const navigate = useNavigate();
  const [limitInfo, setLimitInfo] = useState<ProductLimitInfo>({ current: 0, max: 0, canCreate: false });

  useEffect(() => {
    loadLimitInfo();
  }, []);

  const loadLimitInfo = async () => {
    try {
      const info = await ProductService.getProductLimit();
      setLimitInfo(info);
      
      // Если лимит превышен, показываем предупреждение, но не перенаправляем
      if (!info.canCreate) {
        toast.error(t('products_limit_reached') + '. ' + t('upgrade_plan'));
      }
    } catch (error: any) {
      console.error('Load limit info error:', error);
      // Устанавливаем значения по умолчанию вместо перенаправления
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

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('create_product')}
        description={t('create_product_description')}
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="text-sm flex items-center gap-1.5">
              <Package className="h-4 w-4" />
              <span>{limitInfo.current} / {limitInfo.max}</span>
            </Badge>
            <Button variant="ghost" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back_to_products')}
            </Button>
          </div>
        }
      />

      <ProductForm
        product={null}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};