import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop, type CreateShopData, type UpdateShopData } from '@/lib/shop-service';
import { toast } from 'sonner';

interface ShopFormProps {
  shop?: Shop | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ShopForm = ({ shop, onSuccess, onCancel }: ShopFormProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateShopData>({
    store_name: shop?.store_name || '',
    template_id: shop?.template_id || null,
    custom_mapping: shop?.custom_mapping || null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.store_name.trim()) {
      toast.error(t('shop_name') + ' ' + t('limit_name_required').toLowerCase());
      return;
    }

    try {
      setLoading(true);
      
      if (shop) {
        // Update existing shop
        await ShopService.updateShop(shop.id, formData as UpdateShopData);
        toast.success(t('shop_updated'));
      } else {
        // Create new shop
        await ShopService.createShop(formData);
        toast.success(t('shop_created'));
      }
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Shop save error:', error);
      toast.error(error?.message || t('failed_save_shop'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{shop ? t('edit_shop') : t('create_shop')}</CardTitle>
        <CardDescription>
          {shop ? t('edit_shop_description') : t('create_shop_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store_name">{t('shop_name')}</Label>
            <Input
              id="store_name"
              placeholder={t('shop_name_placeholder')}
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              disabled={loading}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                {t('cancel')}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? t('saving') : (shop ? t('save_changes') : t('create'))}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
