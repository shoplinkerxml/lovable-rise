import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop, type UpdateShopData } from '@/lib/shop-service';
import { useMarketplaces } from '@/hooks/useMarketplaces';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditShopDialogProps {
  shop: Shop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditShopDialog = ({ shop, open, onOpenChange, onSuccess }: EditShopDialogProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState(shop.store_name);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const [productsCount, setProductsCount] = useState(0);
  const { marketplaces, isLoading: marketplacesLoading } = useMarketplaces();

  useEffect(() => {
    if (shop?.template_id) {
      const loadTemplateMarketplace = async () => {
        try {
          // @ts-ignore - table not in generated types yet
          const { data, error } = await (supabase as any)
            .from('store_templates')
            .select('marketplace')
            .eq('id', shop.template_id)
            .single();

          if (!error && data?.marketplace) {
            setSelectedMarketplace(data.marketplace);
          }
        } catch (err) {
          console.error('Error loading template marketplace:', err);
        }
      };
      loadTemplateMarketplace();
    }
  }, [shop?.template_id]);

  // Check if shop has products
  useEffect(() => {
    const checkProducts = async () => {
      try {
        // TODO: заменить на реальную проверку когда будет таблица products
        // @ts-ignore
        const { count } = await (supabase as any)
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('shop_id', shop.id);
        
        setProductsCount(count || 0);
      } catch (err) {
        // Table doesn't exist yet
        setProductsCount(0);
      }
    };
    if (open) {
      checkProducts();
    }
  }, [shop.id, open]);

  const handleMarketplaceChange = async (marketplace: string) => {
    setSelectedMarketplace(marketplace);
    
    try {
      // Get template by marketplace
      // @ts-ignore
      const { data: template, error } = await (supabase as any)
        .from('store_templates')
        .select('id, xml_structure, mapping_rules')
        .eq('marketplace', marketplace)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        return;
      }

      // Update shop with new template data
      if (template) {
        await ShopService.updateShop(shop.id, {
          template_id: template.id,
          xml_config: template.xml_structure,
          custom_mapping: template.mapping_rules
        });
      }
    } catch (err) {
      console.error('Error loading template:', err);
      toast.error('Не вдалося завантажити шаблон');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeName.trim()) {
      toast.error('Назва магазину обов\'язкова');
      return;
    }

    try {
      setLoading(true);
      
      const updateData: UpdateShopData = {
        store_name: storeName.trim()
      };
      
      await ShopService.updateShop(shop.id, updateData);
      toast.success(t('shop_updated'));
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Shop update error:', error);
      toast.error(error?.message || t('failed_save_shop'));
    } finally {
      setLoading(false);
    }
  };

  const canChangeFormat = productsCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редагувати магазин</DialogTitle>
          <DialogDescription>
            Змініть назву та формат вашого магазину
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store_name">{t('shop_name')}</Label>
            <Input
              id="store_name"
              placeholder={t('shop_name_placeholder')}
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplace">Формат магазина</Label>
            <Select
              value={selectedMarketplace}
              onValueChange={handleMarketplaceChange}
              disabled={loading || marketplacesLoading || !canChangeFormat}
            >
              <SelectTrigger id="marketplace">
                <SelectValue placeholder="Оберіть формат магазину" />
              </SelectTrigger>
              <SelectContent>
                {marketplaces.map((marketplace) => (
                  <SelectItem key={marketplace.value} value={marketplace.value}>
                    {marketplace.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {!canChangeFormat 
                ? 'Формат можна змінити тільки якщо не додано жодного товару' 
                : 'Зміна формату скопіює новий шаблон'
              }
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? t('saving') : t('save_changes')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
