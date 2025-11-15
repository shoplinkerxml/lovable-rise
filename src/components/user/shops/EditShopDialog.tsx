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
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus } from 'lucide-react';
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
  const [storeCompany, setStoreCompany] = useState<string>(shop.store_company ?? '');
  const [storeUrl, setStoreUrl] = useState<string>(shop.store_url ?? '');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const [productsCount, setProductsCount] = useState(0);
  const { marketplaces, isLoading: marketplacesLoading } = useMarketplaces();
  const [availableCurrencies, setAvailableCurrencies] = useState<Array<{ code: string; rate?: number }>>([]);
  const [storeCurrencies, setStoreCurrencies] = useState<Array<{ code: string; rate: number; is_base: boolean }>>([]);
  const [addCurrencyCode, setAddCurrencyCode] = useState<string>('');

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

  useEffect(() => {
    const loadCurrencyData = async () => {
      try {
        const { data: sysCurrencies } = await (supabase as any)
          .from('currencies')
          .select('code,rate');
        setAvailableCurrencies((sysCurrencies || []).map((c: any) => ({ code: String(c.code), rate: c.rate as number | undefined })));

        const { data: sc } = await (supabase as any)
          .from('store_currencies')
          .select('code,rate,is_base')
          .eq('store_id', shop.id);
        setStoreCurrencies((sc || []).map((c: any) => ({ code: String(c.code), rate: Number(c.rate || 1), is_base: !!c.is_base })));
      } catch (err) {
        console.error('Load currencies error:', err);
      }
    };
    if (open) loadCurrencyData();
  }, [open, shop.id]);

  const refreshStoreCurrencies = async () => {
    const { data: sc } = await (supabase as any)
      .from('store_currencies')
      .select('code,rate,is_base')
      .eq('store_id', shop.id);
    setStoreCurrencies((sc || []).map((c: any) => ({ code: String(c.code), rate: Number(c.rate || 1), is_base: !!c.is_base })));
  };

  const handleAddCurrency = async () => {
    if (!addCurrencyCode) return;
    try {
      const sys = availableCurrencies.find(c => c.code === addCurrencyCode);
      const defaultRate = sys?.rate != null ? Number(sys.rate) : 1;
      await (supabase as any)
        .from('store_currencies')
        .insert({ store_id: shop.id, code: addCurrencyCode, rate: defaultRate, is_base: false });
      setAddCurrencyCode('');
      await refreshStoreCurrencies();
    } catch (err) {
      console.error('Add currency error:', err);
      toast.error('Не вдалося додати валюту');
    }
  };

  const handleUpdateRate = async (code: string, rate: number) => {
    try {
      await (supabase as any)
        .from('store_currencies')
        .update({ rate })
        .eq('store_id', shop.id)
        .eq('code', code);
      await refreshStoreCurrencies();
    } catch (err) {
      console.error('Update rate error:', err);
      toast.error('Не вдалося оновити курс');
    }
  };

  const handleSetBase = async (code: string) => {
    try {
      await (supabase as any)
        .from('store_currencies')
        .update({ is_base: false })
        .eq('store_id', shop.id);
      await (supabase as any)
        .from('store_currencies')
        .update({ is_base: true })
        .eq('store_id', shop.id)
        .eq('code', code);
      await refreshStoreCurrencies();
    } catch (err) {
      console.error('Set base currency error:', err);
      toast.error('Не вдалося встановити базову валюту');
    }
  };

  const handleDeleteCurrency = async (code: string) => {
    try {
      await (supabase as any)
        .from('store_currencies')
        .delete()
        .eq('store_id', shop.id)
        .eq('code', code);
      await refreshStoreCurrencies();
    } catch (err) {
      console.error('Delete currency error:', err);
      toast.error('Не вдалося видалити валюту');
    }
  };

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
        store_name: storeName.trim(),
        store_company: storeCompany,
        store_url: storeUrl
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
      <DialogContent className="max-w-[clamp(30rem,70vw,46rem)]">
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
            <Label htmlFor="store_company">{t('company')}</Label>
            <Input
              id="store_company"
              placeholder={t('company_placeholder')}
              value={storeCompany}
              onChange={(e) => setStoreCompany(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_url">{t('store_url')}</Label>
            <Input
              id="store_url"
              placeholder={t('store_url_placeholder')}
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              disabled={loading}
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

          {/* Валюти магазину */}
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="text-sm font-medium">{t('shop_currencies')}</div>
              <div className="flex items-center gap-2">
                <Select value={addCurrencyCode} onValueChange={setAddCurrencyCode}>
                  <SelectTrigger className="w-[12rem]" data-testid="shop_currencies_add_select">
                    <SelectValue placeholder={t('select_currency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies
                      .filter(c => !storeCurrencies.some(sc => sc.code === c.code))
                      .map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={handleAddCurrency} disabled={!addCurrencyCode} data-testid="shop_currencies_add_btn">
                  <Plus className="h-4 w-4 mr-2" />{t('add_currency')}
                </Button>
              </div>

              {storeCurrencies.length === 0 ? (
                <div className="text-xs text-muted-foreground">{t('no_currencies_found')}</div>
              ) : (
                <div className="space-y-2">
                  {storeCurrencies.map(cur => (
                    <div key={cur.code} className="flex items-center gap-3" data-testid={`shop_currency_${cur.code}`}>
                      <div className="w-[6rem] text-sm font-medium">{cur.code}</div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`rate_${cur.code}`} className="text-xs">{t('currency_rate')}</Label>
                        <Input
                          id={`rate_${cur.code}`}
                          type="number"
                          step="0.0001"
                          defaultValue={cur.rate}
                          onBlur={(e) => handleUpdateRate(cur.code, parseFloat(e.target.value) || 0)}
                          className="w-[8rem]"
                          data-testid={`shop_currency_rate_${cur.code}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-muted-foreground">{t('base_currency')}</span>
                        <Switch
                          checked={cur.is_base}
                          onCheckedChange={(checked) => checked ? handleSetBase(cur.code) : null}
                          data-testid={`shop_currency_base_${cur.code}`}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => handleDeleteCurrency(cur.code)} data-testid={`shop_currency_del_${cur.code}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
