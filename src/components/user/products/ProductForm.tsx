import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ProductService, type Product, type CreateProductData, type UpdateProductData } from '@/lib/product-service';
import { toast } from 'sonner';

interface ProductFormProps {
  product?: Product | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ProductForm = ({ product, onSuccess, onCancel }: ProductFormProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    price: '',
    sku: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        sku: product.sku || ''
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_name.trim()) {
      toast.error(t('product_name') + ' обов\'язкове');
      return;
    }

    try {
      setLoading(true);
      
      const productData = {
        product_name: formData.product_name,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        sku: formData.sku || null
      };

      if (product) {
        await ProductService.updateProduct(product.id, productData as UpdateProductData);
        toast.success(t('product_updated'));
      } else {
        await ProductService.createProduct(productData as CreateProductData);
        toast.success(t('product_created'));
      }
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Save product error:', error);
      toast.error(error?.message || t('failed_save_product'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? t('edit_product') : t('create_product')}</CardTitle>
        <CardDescription>
          {product ? t('edit_product_description') : t('create_product_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product_name">{t('product_name')}</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder={t('product_name_placeholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('product_description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('description_placeholder')}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">{t('price')}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder={t('price_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder={t('sku_placeholder')}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? t('save_changes') : t('create')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
