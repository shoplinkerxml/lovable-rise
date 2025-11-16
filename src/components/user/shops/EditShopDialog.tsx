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
import { Trash2, Plus, Star } from 'lucide-react';
import { Save, X } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop, type UpdateShopData } from '@/lib/shop-service';
import { useMarketplaces } from '@/hooks/useMarketplaces';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [storeCategories, setStoreCategories] = useState<Array<{
    store_category_id: number;
    store_id: string;
    category_id: number;
    name: string;
    base_external_id: string | null;
    parent_external_id: string | null;
    base_rz_id: string | null;
    store_external_id: string | null;
    store_rz_id: string | null;
    store_rz_id_value: string | null;
    is_active: boolean;
  }>>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'currencies' | 'categories'>('info');

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

  // Проверка наличия товаров в магазине (store_products)
  useEffect(() => {
    const checkProducts = async () => {
      try {
        const { count } = await (supabase as any)
          .from('store_products')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', shop.id);
        setProductsCount(count || 0);
      } catch (err) {
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

  useEffect(() => {
    const loadStoreCategories = async () => {
      try {
        const rows = await ShopService.getStoreCategories(shop.id);
        setStoreCategories(rows);
      } catch (err) {
        console.error('Load store categories error:', err);
      }
    };
    if (open) loadStoreCategories();
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

  const updateCategoryField = async (rowId: number, patch: Partial<{ rz_id: string | null; rz_id_value: string | null; is_active: boolean; custom_name: string | null; external_id: string | null }>) => {
    try {
      await ShopService.updateStoreCategory({ id: rowId, ...patch });
      const rows = await ShopService.getStoreCategories(shop.id);
      setStoreCategories(rows);
      toast.success(t('saved'));
    } catch (err) {
      console.error('Update store category error:', err);
      toast.error(t('failed_save'));
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
      <DialogContent className="max-w-[clamp(30rem,70vw,46rem)] max-h-[80vh] overflow-y-auto py-6 sm:py-8">
        <DialogHeader>
          <DialogTitle>Редагувати магазин</DialogTitle>
          <DialogDescription>
            Змініть назву та формат вашого магазину
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full" data-testid="editShopDialog_tabs">
            <TabsList className="flex w-full gap-2 h-9 overflow-x-auto whitespace-nowrap scroll-smooth no-scrollbar bg-transparent p-0 text-foreground rounded-none border-b border-border justify-start" data-testid="editShopDialog_tabsList">
              <TabsTrigger value="info" className="px-3 text-sm rounded-none border-b-2 border-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary" data-testid="editShopDialog_tab_info">Основна інформація</TabsTrigger>
              <TabsTrigger value="currencies" className="px-3 text-sm rounded-none border-b-2 border-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary" data-testid="editShopDialog_tab_currencies">Валюти</TabsTrigger>
              <TabsTrigger value="categories" className="px-3 text-sm rounded-none border-b-2 border-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary" data-testid="editShopDialog_tab_categories">Категорії</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4" data-testid="editShopDialog_infoContent">
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
            </TabsContent>

            {/* Валюти магазину */}
            <TabsContent value="currencies" className="space-y-4" data-testid="editShopDialog_currenciesContent">
              <div className="text-sm font-medium">{t('shop_currencies')}</div>
              <TooltipProvider>
                <div className="flex items-center justify-between gap-2">
                  <Select value={addCurrencyCode} onValueChange={setAddCurrencyCode}>
                    <SelectTrigger className="w-[clamp(10rem,30vw,12rem)]" data-testid="shop_currencies_add_select">
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
                  <div className="flex items-center gap-2 bg-card/70 backdrop-blur-sm border rounded-md h-9 px-[clamp(0.5rem,1vw,0.75rem)] py-1 shadow-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" onClick={handleAddCurrency} disabled={!addCurrencyCode} data-testid="shop_currencies_add_btn" variant="ghost" size="icon" className="h-8 w-8" aria-label={t('add_currency')}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('add_currency')}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </TooltipProvider>

              {storeCurrencies.length === 0 ? (
                <div className="text-xs text-muted-foreground">{t('no_currencies_found')}</div>
              ) : (
                <div className="space-y-2">
                  {storeCurrencies.map(cur => (
                    <div key={cur.code} className="flex items-center gap-3 h-9" data-testid={`shop_currency_${cur.code}`}>
                      <Badge variant="outline" className="px-2 py-0.5 text-sm">{cur.code}</Badge>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`rate_${cur.code}`}
                          aria-label={t('currency_rate')}
                          type="number"
                          step="0.0001"
                          defaultValue={cur.rate}
                          onBlur={(e) => handleUpdateRate(cur.code, parseFloat(e.target.value) || 0)}
                          className="h-8 w-[clamp(5rem,10vw,6rem)] text-sm"
                          data-testid={`shop_currency_rate_${cur.code}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{t('base_currency')}</span>
                                <Switch
                                  checked={cur.is_base}
                                  onCheckedChange={(checked) => checked ? handleSetBase(cur.code) : null}
                                  data-testid={`shop_currency_base_${cur.code}`}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{t('base_currency')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteCurrency(cur.code)} data-testid={`shop_currency_del_${cur.code}`} aria-label={t('delete')} className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('delete')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Категории магазина */}
            <TabsContent value="categories" className="space-y-4" data-testid="editShopDialog_categoriesContent">
              <div className="text-sm font-medium">{t('shop_categories')}</div>
              {storeCategories.length === 0 ? (
                <div className="text-xs text-muted-foreground">{t('no_categories_found')}</div>
              ) : (
                <div className="space-y-2">
                  {storeCategories.map((cat) => (
                    <div key={cat.store_category_id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3" data-testid={`shop_category_${cat.store_category_id}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-xs">
                          {(cat.store_external_id ?? cat.base_external_id) || '-'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`rzv_${cat.store_category_id}`} className="text-xs">rz_id_value</Label>
                        <Input id={`rzv_${cat.store_category_id}`} defaultValue={cat.store_rz_id_value || ''} className="h-8 w-[10rem]" onBlur={(e) => updateCategoryField(cat.store_category_id, { rz_id_value: e.target.value || null })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">{t('active')}</Label>
                        <Switch checked={cat.is_active} onCheckedChange={(checked) => updateCategoryField(cat.store_category_id, { is_active: checked })} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

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
