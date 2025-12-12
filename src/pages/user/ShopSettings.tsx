import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { useI18n } from "@/providers/i18n-provider";
import { ShopService } from "@/lib/shop-service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Columns as ColumnsIcon, ChevronDown, Plus, Trash2, MoreHorizontal, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ShopSettingsAggregated } from "@/lib/shop-service";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
type StoreCategoryRow = {
  store_category_id: number;
  store_id: string;
  category_id: number;
  name: string;
  base_external_id: string | null;
  store_external_id: string | null;
  store_rz_id_value: string | null;
  is_active: boolean;
};
export default function ShopSettings() {
  const {
    t
  } = useI18n();
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();
  const [shopName, setShopName] = useState<string>("");
  const [storeCompany, setStoreCompany] = useState<string>("");
  const [storeUrl, setStoreUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'info' | 'currencies' | 'categories'>('categories');
  const [productsCount, setProductsCount] = useState(0);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [editRow, setEditRow] = useState<StoreCategoryRow | null>(null);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const cleanupDialogArtifacts = () => {
    try {
      document.querySelectorAll('[inert]').forEach(el => {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      });
      document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
        el.removeAttribute('aria-hidden');
      });
    } catch { void 0; }
  };
  const [editExternalId, setEditExternalId] = useState<string>("");
  const [editRzIdValue, setEditRzIdValue] = useState<string>("");
  const [editActive, setEditActive] = useState<boolean>(true);
  const { data: aggData, isLoading: aggLoading } = useQuery<ShopSettingsAggregated | null>({
    queryKey: ['shopSettingsAgg', id!],
    queryFn: async () => {
      if (!id) return null;
      const payload = await ShopService.getShopSettingsAggregated(id!);
      return payload;
    },
    enabled: !!id,
    staleTime: 900_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev as ShopSettingsAggregated | null | undefined,
  });
  useEffect(() => {
    if (!id) {
      navigate('/user/shops');
      return;
    }
    if (aggData?.shop) {
      setShopName(aggData.shop.store_name);
      setStoreCompany(String(aggData.shop.store_company || ''));
      setStoreUrl(String(aggData.shop.store_url || ''));
      if (aggData.shop.marketplace) setSelectedMarketplace(String(aggData.shop.marketplace));
      setProductsCount(Number(aggData.productsCount || 0));
      setAvailableCurrencies(aggData.availableCurrencies || []);
      setStoreCurrencies(aggData.storeCurrencies || []);
    }
  }, [id, aggData, navigate]);
  const rows: StoreCategoryRow[] = useMemo(() => {
    const src = aggData?.categories ?? [];
    return src.map((r) => ({
      store_category_id: r.store_category_id,
      store_id: r.store_id,
      category_id: r.category_id,
      name: r.name,
      base_external_id: r.base_external_id,
      store_external_id: r.store_external_id,
      store_rz_id_value: r.store_rz_id_value,
      is_active: r.is_active,
    }));
  }, [aggData]);
  
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`store_store_categories_${id}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'store_store_categories', filter: `store_id=eq.${id}` },
      () => {
        queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
      }
    ).subscribe();
    return () => { try { supabase.removeChannel(channel); } catch { void 0; } };
  }, [id, queryClient]);
  const filtered = useMemo(() => rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase())), [rows, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
  const [showNameCol, setShowNameCol] = useState(true);
  const [showCodeCol, setShowCodeCol] = useState(true);
  const [showRozetkaCol, setShowRozetkaCol] = useState(true);
  const [showActiveCol, setShowActiveCol] = useState(true);
  const [showActionsCol, setShowActionsCol] = useState(true);
  const shopBreadcrumbs = [{
    label: t('breadcrumb_home'),
    href: '/user/dashboard'
  }, {
    label: t('shops_title'),
    href: '/user/shops'
  }, {
    label: shopName || '...',
    href: `/user/shops/${id}`
  }, {
    label: t('breadcrumb_settings'),
    current: true
  }];
  const updateCategoryField = async (rowId: number, patch: Partial<{
    rz_id_value: string | null;
    is_active: boolean;
  }>) => {
    await ShopService.updateStoreCategory({
      id: rowId,
      ...patch
    });
    queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
  };
  const [availableCurrencies, setAvailableCurrencies] = useState<Array<{
    code: string;
    rate?: number;
  }>>([]);
  const [storeCurrencies, setStoreCurrencies] = useState<Array<{
    code: string;
    rate: number;
    is_base: boolean;
  }>>([]);
  const [addCurrencyCode, setAddCurrencyCode] = useState<string>('');
  const handleAddCurrency = async () => {
    if (!addCurrencyCode) return;
    const sys = availableCurrencies.find(c => c.code === addCurrencyCode);
    const defaultRate = sys?.rate != null ? Number(sys.rate) : 1;
    await ShopService.addStoreCurrency(id!, addCurrencyCode, defaultRate);
    setAddCurrencyCode('');
    queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
  };
  const handleUpdateRate = async (code: string, rate: number) => {
    await ShopService.updateStoreCurrencyRate(id!, code, rate);
    queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
  };
  const handleSetBase = async (code: string) => {
    await ShopService.setBaseStoreCurrency(id!, code);
    queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
  };
  const handleDeleteCurrency = async (code: string) => {
    await ShopService.deleteStoreCurrency(id!, code);
    queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
  };
  return <div className="p-6 space-y-6" data-testid="shop_settings_page">
      <PageHeader title={shopName} description={t('breadcrumb_settings')} breadcrumbItems={shopBreadcrumbs} />

      <Card>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'info' | 'currencies' | 'categories')} className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="flex w-full gap-2 h-9 overflow-x-auto whitespace-nowrap bg-transparent p-0 text-foreground rounded-none border-b border-border justify-start">
              <TabsTrigger value="info" className="px-3 text-sm rounded-none border-b-2 border-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary">{t('product_tab_main') || 'Основні дані'}</TabsTrigger>
              <TabsTrigger value="currencies" className="px-3 text-sm rounded-none border-b-2 border-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary">{t('shop_currencies')}</TabsTrigger>
              <TabsTrigger value="categories" className="px-3 text-sm rounded-none border-b-2 border-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-primary">{t('shop_categories')}</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">{t('shop_name')}</Label>
                <Input id="store_name" value={shopName} onChange={e => setShopName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_company">{t('company')}</Label>
                <Input id="store_company" value={storeCompany} onChange={e => setStoreCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store_url">{t('store_url')}</Label>
                <Input id="store_url" value={storeUrl} onChange={e => setStoreUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marketplace">Формат магазина</Label>
                <Select value={selectedMarketplace} onValueChange={async marketplace => {
                setSelectedMarketplace(marketplace);
                if (productsCount > 0) return;
                const {
                  data: template
                } = await supabase.from('store_templates').select('id, xml_structure, mapping_rules').eq('marketplace', marketplace).eq('is_active', true).order('created_at', {
                  ascending: false
                }).limit(1).single();
                if (template) {
                  await ShopService.updateShop(id!, {
                    template_id: template.id,
                    xml_config: template.xml_structure,
                    custom_mapping: template.mapping_rules
                  });
                }
              }} disabled={productsCount > 0}>
                  <SelectTrigger id="marketplace">
                    <SelectValue placeholder="Оберіть формат магазину" />
                  </SelectTrigger>
                  <SelectContent>
                    {(aggData?.marketplaces ?? []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{productsCount > 0 ? 'Формат можна змінити тільки якщо не додано жодного товару' : 'Зміна формату скопіює новий шаблон'}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => navigate(`/user/shops/${id}`)}>{t('btn_cancel')}</Button>
                <Button onClick={async () => {
                await ShopService.updateShop(id!, {
                  store_name: shopName.trim(),
                  store_company: storeCompany,
                  store_url: storeUrl
                });
              }}>{t('save_changes') || 'Зберегти зміни'}</Button>
              </div>
            </TabsContent>

            <TabsContent value="currencies" className="space-y-4">
              <div className="text-sm font-medium">{t('shop_currencies')}</div>
              <div className="flex items-center justify-between gap-2">
                <Select value={addCurrencyCode} onValueChange={setAddCurrencyCode}>
                  <SelectTrigger className="w-[clamp(10rem,30vw,12rem)]" data-testid="shop_settings_addCurrency_select">
                    <SelectValue placeholder={t('select_currency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.filter(c => !storeCurrencies.some(sc => sc.code === c.code)).map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 bg-card/70 backdrop-blur-sm border rounded-md h-9 px-[clamp(0.5rem,1vw,0.75rem)] py-1 shadow-sm">
                  <Button type="button" onClick={handleAddCurrency} disabled={!addCurrencyCode} variant="ghost" size="icon" className="h-8 w-8" aria-label={t('add_currency')} data-testid="shop_settings_addCurrency_btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {storeCurrencies.length === 0 ? <div className="text-xs text-muted-foreground">{t('no_currencies_found')}</div> : <div className="space-y-2">
                  {storeCurrencies.map(cur => <div key={cur.code} className="flex items-center gap-3 h-9">
                      <Badge variant="outline" className="px-2 py-0.5 text-sm">{cur.code}</Badge>
                      <Input type="number" step="0.0001" defaultValue={cur.rate} onBlur={e => handleUpdateRate(cur.code, parseFloat(e.target.value) || 0)} className="h-8 w-[clamp(5rem,10vw,6rem)] text-sm" />
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-muted-foreground">{t('base_currency')}</span>
                        <Switch checked={cur.is_base} onCheckedChange={checked => checked ? handleSetBase(cur.code) : null} />
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCurrency(cur.code)} disabled={cur.is_base} className="h-8 w-8" aria-disabled={cur.is_base}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
            
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Input placeholder={t('search_placeholder')} value={search} onChange={e => {
                  setSearch(e.target.value);
                  setPageIndex(0);
                }} className="w-[clamp(12rem,40vw,24rem)]" data-testid="shop_settings_filter" />
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={selectedRowIds.length !== 1} onClick={() => {
                    const cat = rows.find(r => r.store_category_id === selectedRowIds[0]);
                    if (cat) {
                      setEditRow(cat);
                      setEditExternalId(String(cat.store_external_id ?? cat.base_external_id ?? ''));
                      setEditRzIdValue(String(cat.store_rz_id_value ?? ''));
                      setEditActive(!!cat.is_active);
                      setEditOpen(true);
                    }
                  }} data-testid="shop_settings_edit_btn">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={selectedRowIds.length === 0} onClick={async () => {
                    for (const catId of selectedRowIds) {
                      const cat = rows.find(r => r.store_category_id === catId);
                      if (cat) {
                        await ShopService.deleteStoreCategoryWithProducts(id!, cat.category_id);
                      }
                    }
                    queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
                    setSelectedRowIds([]);
                  }} data-testid="shop_settings_delete_btn">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('view_options')} data-testid="shop_settings_viewOptions">
                        <ColumnsIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuCheckboxItem checked={showNameCol} onCheckedChange={v => setShowNameCol(!!v)}>{t('category_name')}</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={showCodeCol} onCheckedChange={v => setShowCodeCol(!!v)}>{t('code')}</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={showRozetkaCol} onCheckedChange={v => setShowRozetkaCol(!!v)}>{t('rozetka_category')}</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={showActiveCol} onCheckedChange={v => setShowActiveCol(!!v)}>{t('active')}</DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={showActionsCol} onCheckedChange={v => setShowActionsCol(!!v)}>{t('actions')}</DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&>tr]:border-b sticky top-0 z-10 bg-muted">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground"> 
                      <div className="flex items-center justify-center">
                        <Checkbox checked={selectedRowIds.length === pageRows.length && pageRows.length > 0 ? true : selectedRowIds.length > 0 ? "indeterminate" : false} onCheckedChange={value => {
                              if (value) setSelectedRowIds(pageRows.map(r => r.store_category_id));else setSelectedRowIds([]);
                            }} aria-label={t('select_all') || 'Вибрати все'} />
                      </div>
                    </th>
                    {showNameCol && <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">{t('category_name')}</th>}
                    {showCodeCol && <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">{t('code')}</th>}
                    {showRozetkaCol && <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">{t('rozetka_category')}</th>}
                    {showActiveCol && <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">{t('active')}</th>}
                    {showActionsCol && <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">{t('actions')}</th>}
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child]:border-0">
                  {pageRows.length === 0 ? <tr>
                      <td colSpan={6} className="p-3 text-center text-sm text-muted-foreground" data-testid="shop_settings_empty">{t('no_categories_found')}</td>
                    </tr> : pageRows.map(cat => <tr key={cat.store_category_id} className="border-b transition-colors hover:bg-muted/50" data-testid={`shop_settings_row_${cat.store_category_id}`}>
                        <td className="p-2 align-middle">
                          <div className="flex items-center justify-center">
                            <Checkbox checked={selectedRowIds.includes(cat.store_category_id)} onCheckedChange={value => {
                              setSelectedRowIds(prev => value ? [...prev, cat.store_category_id] : prev.filter(id => id !== cat.store_category_id));
                            }} aria-label={t('select_row') || 'Вибрати рядок'} />
                          </div>
                        </td>
                        {showNameCol && <td className="p-2 align-middle"><span className="text-sm font-medium truncate block max-w-[30rem]">{cat.name}</span></td>}
                        {showCodeCol && <td className="p-2 align-middle"><Badge variant="outline" className="px-1.5 py-0 text-xs border-0">{(cat.store_external_id ?? cat.base_external_id) || '-'}</Badge></td>}
                        {showRozetkaCol && <td className="p-2 align-middle">
                          <Input id={`rzv_${cat.store_category_id}`} defaultValue={cat.store_rz_id_value || ''} className="h-8 w-[10rem] border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none" onBlur={e => updateCategoryField(cat.store_category_id, {
                            rz_id_value: e.target.value || null
                          })} data-testid={`shop_settings_rzid_${cat.store_category_id}`} />
                        </td>}
                        {showActiveCol && <td className="p-2 align-middle">
                          <Switch checked={cat.is_active} onCheckedChange={checked => updateCategoryField(cat.store_category_id, {
                            is_active: checked
                          })} data-testid={`shop_settings_active_${cat.store_category_id}`} />
                        </td>}
                        {showActionsCol && <td className="p-2 align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`shop_settings_rowActions_${cat.store_category_id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => {
                                setEditRow(cat);
                                setEditExternalId(String(cat.store_external_id ?? cat.base_external_id ?? ''));
                                setEditRzIdValue(String(cat.store_rz_id_value ?? ''));
                                setEditActive(!!cat.is_active);
                                setEditOpen(true);
                              }}>
                                <Pencil className="mr-2 h-4 w-4" />{t('edit') || 'Редагувати'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={async () => {
                                await ShopService.deleteStoreCategoryWithProducts(id!, cat.category_id);
                                queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
                                setSelectedRowIds(prev => prev.filter(pid => pid !== cat.store_category_id));
                              }}>
                                <Trash2 className="mr-2 h-4 w-4" />{t('delete') || 'Видалити'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>}
                      </tr>)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit modal */}
          <Dialog open={editOpen} onOpenChange={open => {
                setEditOpen(open);
                if (!open) {
                  setEditRow(null);
                  cleanupDialogArtifacts();
                }
              }}>
            <DialogContent className="max-w-[clamp(22rem,60vw,32rem)]">
              <DialogHeader>
                <DialogTitle>{t('edit') || 'Редагувати'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-category-name">{t('category_name')}</Label>
                  
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category-code">Код категорії</Label>
                  <div className="text-sm text-muted-foreground">{editExternalId || '-'}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-rozetka-category">Категорія Rozetka</Label>
                  <Input id="edit-rozetka-category" value={editRzIdValue} onChange={e => setEditRzIdValue(e.target.value)} placeholder="Введіть ID категорії Rozetka" className="border-0 focus-visible:ring-0 focus-visible:outline-none shadow-none" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-active">{t('active')}</Label>
                  <Switch id="edit-active" checked={editActive} onCheckedChange={setEditActive} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setEditOpen(false); setEditRow(null); cleanupDialogArtifacts(); }}>{t('btn_cancel') || 'Скасувати'}</Button>
                <Button onClick={async () => {
                      if (editRow) {
                        await ShopService.updateStoreCategory({
                          id: editRow.store_category_id,
                          rz_id_value: editRzIdValue || null,
                          is_active: editActive
                        });
                        queryClient.invalidateQueries({ queryKey: ['shopSettingsAgg', id] });
                        setEditOpen(false);
                        setEditRow(null);
                        cleanupDialogArtifacts();
                      }
                    }}>{t('save_changes') || 'Зберегти зміни'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2" data-testid="shop_settings_footer">
            <div className="text-xs text-muted-foreground" data-testid="shop_settings_selectionStatus">
              {(() => {
                    const selected = selectedRowIds.length;
                    const total = filtered.length || 0;
                    return t('rows_selected') === 'Вибрано' ? `Вибрано ${selected} з ${total} рядків.` : `${selected} of ${total} row(s) selected.`;
                  })()}
            </div>
            <div className="flex items-center gap-2"></div>
            <div className="flex items-center gap-2">
              <div className="text-sm" data-testid="parametersDataTable_rowsPerPageLabel">{t('page_size')}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8" data-testid="shop_settings_pageSize">
                    {pageSize}
                    <ChevronDown className="ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {[5, 10, 20, 50].map(size => <DropdownMenuCheckboxItem key={size} checked={pageSize === size} onCheckedChange={() => {
                        setPageSize(size);
                        setPageIndex(0);
                      }} data-testid={`shop_settings_pageSize_${size}`}>
                      {size}
                    </DropdownMenuCheckboxItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2" data-testid="shop_settings_pagination">
              <Button variant="outline" size="sm" onClick={() => setPageIndex(p => Math.max(0, p - 1))} disabled={pageIndex === 0}>&lt;</Button>
              <span className="text-sm">{pageIndex + 1} / {pageCount}</span>
              <Button variant="outline" size="sm" onClick={() => setPageIndex(p => Math.min(pageCount - 1, p + 1))} disabled={pageIndex >= pageCount - 1}>&gt;</Button>
            </div>
          </div>
            </CardContent>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>;
}
