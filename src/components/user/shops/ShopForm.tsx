import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput } from '@/components/ui/input-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Store, Tag } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop, type CreateShopData, type UpdateShopData } from '@/lib/shop-service';
import { useMarketplaces } from '@/hooks/useMarketplaces';
import { supabase } from '@/integrations/supabase/client';
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
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const { marketplaces, isLoading: marketplacesLoading } = useMarketplaces();

  // Load marketplace from template_id when editing
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

  const handleMarketplaceChange = async (marketplace: string) => {
    setSelectedMarketplace(marketplace);
    
    try {
      // Get template by marketplace
      // @ts-ignore - table not in generated types yet
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

      if (template) {
        // Copy template data: id→template_id, xml_structure→xml_config, mapping_rules→custom_mapping
        setFormData(prev => ({
          ...prev,
          template_id: template.id,
          xml_config: template.xml_structure || null,
          custom_mapping: template.mapping_rules || null
        }));
      }
    } catch (err) {
      console.error('Error loading template:', err);
      toast.error('Failed to load template');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.store_name.trim()) {
      toast.error(t('shop_name') + ' ' + t('limit_name_required').toLowerCase());
      return;
    }

    if (!selectedMarketplace && !shop) {
      toast.error('Виберіть формат магазину');
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
    <Card className="max-w-2xl mx-auto">
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
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText>
                  <Store />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="store_name"
                placeholder={t('shop_name_placeholder')}
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                disabled={loading}
                required
              />
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplace">Формат магазина</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText>
                  <Tag />
                </InputGroupText>
              </InputGroupAddon>
              <Select
                value={selectedMarketplace}
                onValueChange={handleMarketplaceChange}
                disabled={loading || marketplacesLoading || !!shop}
              >
                <SelectTrigger id="marketplace" className="flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent">
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
            </InputGroup>
            {shop && (
              <p className="text-sm text-muted-foreground">
                Формат магазину можна змінити тільки при створенні
              </p>
            )}
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
