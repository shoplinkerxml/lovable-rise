import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Loader2, Plus, X, Upload, Link, Package, Image, Settings, Save, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { ProductService } from "@/lib/product-service";
import { SupplierService } from "@/lib/supplier-service";
import { ShopService } from "@/lib/shop-service";
import { supabase } from "@/integrations/supabase/client";
import { R2Storage } from "@/lib/r2-storage";
import { useI18n } from "@/providers/i18n-provider";

interface ProductFormTabsProps {
  product?: any | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ProductParam {
  name: string;
  value: string;
  paramid?: string;
  valueid?: string;
  order_index: number;
}

interface ProductImage {
  url: string;
  order_index: number;
  alt_text?: string;
  is_main?: boolean;
  object_key?: string;
}

export const ProductFormTabs = ({ product, onSuccess, onCancel }: ProductFormTabsProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
  const [formData, setFormData] = useState({
    // Основна інформація
    name: '',
    name_ua: '',
    description: '',
    description_ua: '',
    external_id: '',
    
    // Зв'язки
    store_id: '',
    supplier_id: '',
    category_external_id: '',
    currency_code: 'UAH',
    
    // Товарна інформація
    vendor: '',
    article: '',
    url: '',
    
    // Ціни
    price: '',
    price_old: '',
    price_promo: '',
    
    // Склад та статус
    stock_quantity: '',
    available: true,
    state: 'new',
    docket: '',
    docket_ua: ''
  });
  
  const [params, setParams] = useState<ProductParam[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    loadInitialData();
    if (product) {
      loadProductData();
    }
  }, [product]);

  useEffect(() => {
    return () => {
      // Очистка временных загрузок при уходе со страницы
      R2Storage.cleanupPendingUploads();
    };
  }, []);

  const loadProductData = async () => {
    if (!product) return;
    
    try {
      setFormData({
        name: product.name || '',
        name_ua: product.name_ua || '',
        description: product.description || '',
        description_ua: product.description_ua || '',
        external_id: product.external_id || '',
        store_id: product.store_id || '',
        supplier_id: product.supplier_id || '',
        category_external_id: product.category_external_id || '',
        currency_code: product.currency_code || 'UAH',
        vendor: product.vendor || '',
        article: product.article || '',
        url: product.url || '',
        price: product.price?.toString() || '',
        price_old: product.price_old?.toString() || '',
        price_promo: product.price_promo?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        available: product.available !== false,
        state: product.state || 'new',
        docket: product.docket || '',
        docket_ua: product.docket_ua || ''
      });

      // Загружаем параметры товара
      if (product.id) {
        const { data: productParams } = await supabase
          .from('store_product_params')
          .select('*')
          .eq('product_id', product.id)
          .order('order_index');

        if (productParams) {
          setParams(productParams.map(p => ({
            name: p.name,
            value: p.value,
            paramid: (p as any).paramid || '',
            valueid: (p as any).valueid || '',
            order_index: p.order_index
          })));
        }

        // Загружаем изображения товара
        const { data: productImages } = await supabase
          .from('store_product_images')
          .select('*')
          .eq('product_id', product.id)
          .order('order_index');

        if (productImages) {
          const resolved = await Promise.all(productImages.map(async (img) => {
            let previewUrl = img.url;
            const objectKeyRaw = typeof img.url === 'string' ? R2Storage.extractObjectKeyFromUrl(img.url) : null;
            if (typeof previewUrl === 'string' && (previewUrl.includes('r2.dev') || previewUrl.includes('cloudflarestorage.com'))) {
              const objectKey = R2Storage.extractObjectKeyFromUrl(previewUrl);
              if (objectKey) {
                try {
                  const signed = await R2Storage.getViewUrl(objectKey);
                  if (signed) previewUrl = signed;
                } catch (e) {
                  console.warn('Failed to sign view URL for image:', e);
                }
              }
            }
            return {
              url: previewUrl,
              order_index: img.order_index,
              is_main: img.order_index === 0,
              object_key: objectKeyRaw || undefined,
            } as ProductImage;
          }));
          setImages(resolved);
        }
      }
    } catch (error) {
      console.error('Load product data error:', error);
      toast.error('Помилка завантаження даних товару');
    }
  };

  const loadInitialData = async () => {
    try {
      // Загружаем магазины
      const storesData = await ShopService.getShops();
      console.log('STORES DEBUG:', storesData);
      setStores(storesData || []);
      
      if (storesData && storesData.length > 0 && !formData.store_id) {
        setFormData(prev => ({ ...prev, store_id: storesData[0].id }));
      }

      // Загружаем поставщиков
      const suppliersData = await SupplierService.getSuppliers();
      setSuppliers(suppliersData);

      // Загружаем валюты
      const { data: currenciesData } = await supabase
        .from('currencies')
        .select('*')
        .eq('status', true)
        .order('name');
      setCurrencies(currenciesData || []);
    } catch (error) {
      console.error('Load initial data error:', error);
      toast.error('Помилка завантаження початкових даних');
    }
  };

  const addParam = () => {
    setParams([...params, { 
      name: '', 
      value: '', 
      paramid: '',
      valueid: '',
      order_index: params.length 
    }]);
  };

  const updateParam = (index: number, field: keyof ProductParam, value: string) => {
    const updatedParams = [...params];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    setParams(updatedParams);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const addImageByUrl = () => {
    if (!newImageUrl.trim()) {
      toast.error('Введіть URL зображення');
      return;
    }

    const newImage: ProductImage = {
      url: newImageUrl.trim(),
      order_index: images.length,
      is_main: images.length === 0
    };

    setImages([...images, newImage]);
    setNewImageUrl('');
    toast.success('Зображення додано');
  };

  const removeImage = async (index: number) => {
    const target = images[index];
    try {
      const objectKey = target?.object_key || (target?.url ? R2Storage.extractObjectKeyFromUrl(target.url) : null);
      if (objectKey) {
        await R2Storage.deleteFile(objectKey);
      }
      const updatedImages = images.filter((_, i) => i !== index);
      const reorderedImages = updatedImages.map((img, i) => ({
        ...img,
        order_index: i,
        is_main: i === 0 && updatedImages.length > 0
      }));
      setImages(reorderedImages);
      toast.success(t('image_deleted_successfully'));
    } catch (error) {
      console.error('Failed to delete image from R2:', error);
      toast.error(t('failed_delete_image'));
    }
  };

  const setMainImage = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_main: i === index
    }));
    setImages(updatedImages);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация типа и размера
    if (!file.type.startsWith('image/')) {
      toast.error(t('choose_image_file'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('file_too_large_5mb'));
      return;
    }

    try {
      setLoading(true);
      
      // Используем новый API для загрузки через proxy
      const result = await R2Storage.uploadFile(file, formData.external_id);

      const newImage = {
        url: result.viewUrl || result.publicUrl,
        order_index: images.length,
        is_main: images.length === 0,
        object_key: result.objectKey,
      };
      setImages([...images, newImage]);
      toast.success(t('image_uploaded_successfully'));
    } catch (error) {
      console.error('Error uploading image to R2:', error);
      
      // Улучшенная обработка ошибок
      let errorMessage = t('failed_upload_image');
      if (error instanceof Error) {
        if (error.message.includes('unauthorized')) {
          errorMessage = t('upload_unauthorized');
        } else if (error.message.includes('file_too_large')) {
          errorMessage = t('file_too_large_5mb');
        } else if (error.message.includes('invalid_file_type')) {
          errorMessage = t('choose_image_file');
        } else if (error.message.includes('upload_failed')) {
          errorMessage = t('upload_server_error');
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      // Очищаем input для возможности повторной загрузки того же файла
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Введіть назву товару');
      setActiveTab("basic");
      return;
    }

    if (!formData.external_id.trim()) {
      toast.error('Введіть External ID');
      setActiveTab("basic");
      return;
    }

    if (!formData.store_id) {
      toast.error('Оберіть магазин');
      setActiveTab("basic");
      return;
    }

    setLoading(true);

    try {
      // Находим валюту по коду для получения currency_id
      const selectedCurrency = currencies.find(c => c.code === formData.currency_code);
      
      // Создаем или обновляем запись в store_currencies
      if (selectedCurrency) {
        const { error: storeCurrencyError } = await supabase
          .from('store_currencies')
          .upsert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            store_id: formData.store_id,
            currency_id: selectedCurrency.id,
            name: selectedCurrency.name,
            code: selectedCurrency.code,
            symbol: selectedCurrency.symbol,
            is_active: true
          }, {
            onConflict: 'user_id,store_id,currency_id'
          });

        if (storeCurrencyError) {
          console.error('Store currency upsert error:', storeCurrencyError);
        }
      }

      const productData = {
        store_id: formData.store_id,
        external_id: formData.external_id,
        category_external_id: formData.category_external_id || null,
        currency_id: selectedCurrency?.id || null,
        name: formData.name,
        name_ua: formData.name_ua || null,
        vendor: formData.vendor || null,
        article: formData.article || null,
        url: formData.url || null,
        available: formData.available,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        price: formData.price ? parseFloat(formData.price) : null,
        price_old: formData.price_old ? parseFloat(formData.price_old) : null,
        price_promo: formData.price_promo ? parseFloat(formData.price_promo) : null,
        description: formData.description || null,
        description_ua: formData.description_ua || null,
        docket: formData.docket || null,
        docket_ua: formData.docket_ua || null,
        state: formData.state,
        params: params,
        images: images
      };

      let savedProduct;
      if (product) {
        savedProduct = await ProductService.updateProduct(product.id, productData);
        toast.success('Товар успішно оновлено');
      } else {
        savedProduct = await ProductService.createProduct(productData);
        toast.success('Товар успішно створено');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Save product error:', error);
      toast.error('Помилка збереження товару');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="productFormTabs_form">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="productFormTabs_tabs">
        <div className="flex items-center justify-between mb-6" data-testid="productFormTabs_header">
          <TabsList className="grid w-full max-w-md grid-cols-3" data-testid="productFormTabs_tabsList">
            <TabsTrigger 
              value="basic" 
              className="flex items-center gap-2"
              data-testid="productForm_basicTab"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Основна інформація</span>
              <span className="sm:hidden">Основне</span>
            </TabsTrigger>
            <TabsTrigger 
              value="images" 
              className="flex items-center gap-2"
              data-testid="productForm_imagesTab"
            >
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Зображення</span>
              <span className="sm:hidden">Фото</span>
            </TabsTrigger>
            <TabsTrigger 
              value="params" 
              className="flex items-center gap-2"
              data-testid="productForm_paramsTab"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Характеристики</span>
              <span className="sm:hidden">Параметри</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={loading}
              data-testid="productForm_saveButton"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {product ? t('update') : t('create')}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                data-testid="productForm_cancelButton"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('cancel')}
              </Button>
            )}
          </div>
        </div>

        {/* Основна інформація */}
        <TabsContent value="basic" className="space-y-6" data-testid="productFormTabs_basicContent">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="productFormTabs_basicGrid">
            {/* Основні поля */}
            <div className="lg:col-span-2 space-y-6" data-testid="productFormTabs_mainFields">
              <Card data-testid="productFormTabs_basicInfoCard">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('product_main_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('product_name_ru')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('product_name_ru_placeholder')}
                        required
                        data-testid="productForm_name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name_ua">{t('product_name_uk')}</Label>
                      <Input
                        id="name_ua"
                        value={formData.name_ua}
                        onChange={(e) => setFormData({ ...formData, name_ua: e.target.value })}
                        placeholder={t('product_name_uk_placeholder')}
                        data-testid="productForm_nameUa"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('product_description_ru')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('product_description_ru_placeholder')}
                      rows={4}
                      data-testid="productForm_description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description_ua">{t('product_description_uk')}</Label>
                    <Textarea
                      id="description_ua"
                      value={formData.description_ua}
                      onChange={(e) => setFormData({ ...formData, description_ua: e.target.value })}
                      placeholder={t('product_description_uk_placeholder')}
                      rows={4}
                      data-testid="productForm_descriptionUa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency_code">{t('currency')} *</Label>
                    <Select
                      value={formData.currency_code}
                      onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
                    >
                      <SelectTrigger data-testid="productForm_currency">
                        <SelectValue placeholder={t('select_currency')} />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="external_id">{t('external_id')} *</Label>
                      <Input
                        id="external_id"
                        value={formData.external_id}
                        onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                        placeholder={t('external_id_placeholder')}
                        required
                        data-testid="productForm_externalId"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="article">{t('article')}</Label>
                      <Input
                        id="article"
                        value={formData.article}
                        onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                        placeholder={t('article_placeholder')}
                        data-testid="productForm_article"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vendor">{t('manufacturer')}</Label>
                      <Input
                        id="vendor"
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                        placeholder={t('manufacturer_placeholder')}
                        data-testid="productForm_vendor"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="url">{t('product_url')}</Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder={t('product_url_placeholder')}
                      type="url"
                      data-testid="productForm_url"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Бічна панель */}
            <div className="space-y-6" data-testid="productFormTabs_sidebar">
              {/* Магазин та постачальник */}
              <Card data-testid="productFormTabs_storeSupplierCard">
                <CardHeader>
                  <CardTitle>{t('store_supplier')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store">{t('store')} *</Label>
                    <Select
                      value={formData.store_id}
                      onValueChange={(value) => setFormData({ ...formData, store_id: value })}
                    >
                      <SelectTrigger data-testid="productFormTabs_storeSelect">
                        <SelectValue placeholder={t('select_store')} />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.store_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier">{t('supplier')}</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                    >
                      <SelectTrigger data-testid="productFormTabs_supplierSelect">
                        <SelectValue placeholder={t('select_supplier')} />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.supplier_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Ціни */}
              <Card data-testid="productFormTabs_pricesCard">
                <CardHeader>
                  <CardTitle data-testid="productFormTabs_pricesTitle">{t('prices_stock')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currency_code">{t('currency')}</Label>
                    <Select
                      value={formData.currency_code}
                      onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
                    >
                      <SelectTrigger data-testid="productFormTabs_currencySelect">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UAH">{t('currency_uah')}</SelectItem>
                        <SelectItem value="USD">{t('currency_usd')}</SelectItem>
                        <SelectItem value="EUR">{t('currency_eur')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">{t('current_price')}</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      data-testid="productForm_price"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_old">{t('old_price')}</Label>
                    <Input
                      id="price_old"
                      type="number"
                      step="0.01"
                      value={formData.price_old}
                      onChange={(e) => setFormData({ ...formData, price_old: e.target.value })}
                      placeholder="0.00"
                      data-testid="productForm_priceOld"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_promo">{t('promo_price')}</Label>
                    <Input
                      id="price_promo"
                      type="number"
                      step="0.01"
                      value={formData.price_promo}
                      onChange={(e) => setFormData({ ...formData, price_promo: e.target.value })}
                      placeholder="0.00"
                      data-testid="productForm_pricePromo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">{t('stock_quantity')}</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="0"
                      data-testid="productForm_stockQuantity"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="available"
                      checked={formData.available}
                      onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                      className="rounded border-gray-300"
                      data-testid="productForm_available"
                    />
                    <Label htmlFor="available">{t('product_available')}</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Зображення */}
        <TabsContent value="images" className="space-y-6" data-testid="productFormTabs_imagesContent">
          <Card data-testid="productFormTabs_imagesCard">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                {t('product_images')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Додавання зображень */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('add_image_by_url')}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder={t('enter_image_url')}
                        className="flex-1"
                        data-testid="productForm_imageUrl"
                      />
                      <Button 
                        type="button" 
                        onClick={addImageByUrl} 
                        size="sm" 
                        variant="outline"
                        data-testid="productForm_addImageUrl"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        {t('btn_add')}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('upload_file')}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.avif,image/avif"
                        onChange={handleFileUpload}
                        className="flex-1"
                        data-testid="productForm_imageFile"
                      />
                      <Button type="button" size="sm" variant="outline" disabled>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('btn_upload')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('file_upload_later')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Карусель зображень */}
              {images.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Image className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t('no_images_added')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('add_images_instruction')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium">{t('added_images')} ({images.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                          <img
                            src={image.url}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNkM5Ljc5IDEzLjc5IDkuNzkgMTAuMjEgMTIgOEMxNC4yMSAxMC4yMSAxNC4yMSAxMy43OSAxMiAxNloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
                            }}
                          />
                        </div>
                        {image.is_main && (
                          <div className="absolute top-2 left-2">
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              {t('main_image')}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => setMainImage(index)}
                            size="icon"
                            variant="ghost"
                            aria-label={image.is_main ? t('main_image') : t('set_as_main')}
                            data-testid={`productForm_setMainImage_${index}`}
                            className={`rounded-md ${image.is_main ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-success text-primary-foreground hover:bg-success/90'}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => removeImage(index)}
                            size="icon"
                            variant="destructive"
                            data-testid={`productForm_removeImage_${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Характеристики */}
        <TabsContent value="params" className="space-y-6" data-testid="productFormTabs_paramsContent">
          <Card data-testid="productFormTabs_paramsCard">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t('product_characteristics')}
                </div>
                <Button 
                  type="button" 
                  onClick={addParam} 
                  size="sm" 
                  variant="outline"
                  data-testid="productForm_addParam"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('add_characteristic')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {params.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t('no_characteristics_added')}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('add_characteristics_instruction')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {params.map((param, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <Label htmlFor={`param-name-${index}`}>{t('characteristic_name')} *</Label>
                          <Input
                            id={`param-name-${index}`}
                            value={param.name}
                            onChange={(e) => updateParam(index, 'name', e.target.value)}
                            placeholder={t('characteristic_name_placeholder')}
                            data-testid={`productForm_paramName_${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`param-value-${index}`}>{t('value')} *</Label>
                          <Input
                            id={`param-value-${index}`}
                            value={param.value}
                            onChange={(e) => updateParam(index, 'value', e.target.value)}
                            placeholder={t('characteristic_value_placeholder')}
                            data-testid={`productForm_paramValue_${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`param-paramid-${index}`}>Param ID</Label>
                          <Input
                            id={`param-paramid-${index}`}
                            value={param.paramid || ''}
                            onChange={(e) => updateParam(index, 'paramid', e.target.value)}
                            placeholder={t('param_id_placeholder')}
                            data-testid={`productForm_paramId_${index}`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`param-valueid-${index}`}>Value ID</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`param-valueid-${index}`}
                              value={param.valueid || ''}
                              onChange={(e) => updateParam(index, 'valueid', e.target.value)}
                              placeholder={t('value_id_placeholder')}
                              data-testid={`productForm_valueId_${index}`}
                            />
                            <Button
                              type="button"
                              onClick={() => removeParam(index)}
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              data-testid={`productForm_removeParam_${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
};