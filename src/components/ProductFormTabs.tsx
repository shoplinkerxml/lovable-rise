import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Plus, Minus, Upload, Link, X, Image as ImageIcon, Settings, Package } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { ProductPlaceholder } from '@/components/ProductPlaceholder';
import { useI18n } from '@/providers/i18n-provider';
import { ProductService } from '@/lib/product-service';
interface ProductFormTabsProps {
  product?: Tables<'store_products'>;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
}
interface ProductParam {
  id?: string;
  name: string;
  value: string;
  order_index: number;
}
interface ProductImage {
  id?: string;
  url: string;
  alt_text?: string;
  order_index: number;
  is_main: boolean;
}
interface FormData {
  name: string;
  name_ua: string;
  description: string;
  description_ua: string;
  vendor: string;
  brand: string;
  article: string;
  sku: string;
  external_id: string;
  category_id: string;
  currency_id: string;
  price: number;
  price_old: number;
  price_promo: number;
  stock_quantity: number;
  available: boolean;
  state: string;
  url: string;
  store_id: string;
}
export function ProductFormTabs({
  product,
  onSubmit,
  onCancel
}: ProductFormTabsProps) {
  const navigate = useNavigate();
  const {
    t
  } = useI18n();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    name_ua: '',
    description: '',
    description_ua: '',
    vendor: '',
    brand: '',
    article: '',
    sku: '',
    external_id: '',
    category_id: '',
    currency_id: '',
    price: 0,
    price_old: 0,
    price_promo: 0,
    stock_quantity: 0,
    available: true,
    state: 'new',
    url: '',
    store_id: ''
  });

  // Images state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Parameters state
  const [parameters, setParameters] = useState<ProductParam[]>([]);
  const [newParam, setNewParam] = useState({
    name: '',
    value: ''
  });

  // Lookup data
  const [stores, setStores] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadLookupData();
    if (product) {
      loadProductData();
    }
  }, [product]);
  const loadLookupData = async () => {
    try {
      // Load stores
      const storesData = await ProductService.getUserStores();

      // Load suppliers
      const {
        data: suppliersData
      } = await supabase.from('user_suppliers').select('*').order('supplier_name');

      // Load categories
      const {
        data: categoriesData
      } = await supabase.from('store_categories').select('*').order('name');

      // Load currencies
      const {
        data: currenciesData
      } = await supabase.from('currencies').select('*').eq('status', true).order('name');
      setStores(storesData || []);
      setSuppliers(suppliersData || []);
      setCategories(categoriesData || []);
      setCurrencies(currenciesData || []);
    } catch (error) {
      console.error('Error loading lookup data:', error);
      toast.error(t('failed_load_data'));
    }
  };
  const loadProductData = async () => {
    if (!product) return;
    try {
      // Load product data
      setFormData({
        name: product.name || '',
        name_ua: product.name_ua || '',
        description: product.description || '',
        description_ua: product.description_ua || '',
        vendor: product.vendor || '',
        brand: product.brand || '',
        article: product.article || '',
        sku: product.sku || '',
        external_id: product.external_id || '',
        category_id: product.category_id || '',
        currency_id: product.currency_id || '',
        price: product.price || 0,
        price_old: product.price_old || 0,
        price_promo: product.price_promo || 0,
        stock_quantity: product.stock_quantity || 0,
        available: product.available || true,
        state: product.state || 'new',
        url: product.url || '',
        store_id: product.store_id || ''
      });

      // Load images
      const {
        data: imagesData
      } = await supabase.from('store_product_images').select('*').eq('product_id', product.id).order('order_index');
      if (imagesData) {
        setImages(imagesData.map(img => ({
          id: img.id,
          url: img.url,
          alt_text: img.alt_text || '',
          order_index: img.order_index,
          is_main: img.is_main
        })));
      }

      // Load parameters
      const {
        data: paramsData
      } = await supabase.from('store_product_params').select('*').eq('product_id', product.id).order('order_index');
      if (paramsData) {
        setParameters(paramsData.map(param => ({
          id: param.id,
          name: param.name,
          value: param.value,
          order_index: param.order_index
        })));
      }
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error(t('failed_load_product_data'));
    }
  };
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error(t('product_name_required'));
      return;
    }
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({
          formData,
          images,
          parameters
        });
      }
      toast.success(t('product_saved_successfully'));
      navigate('/user/products');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(t('failed_save_product'));
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/user/products');
    }
  };

  // Image handling functions
  const addImageFromUrl = () => {
    if (!imageUrl.trim()) return;
    const newImage: ProductImage = {
      url: imageUrl,
      order_index: images.length,
      is_main: images.length === 0
    };
    setImages([...images, newImage]);
    setImageUrl('');
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const {
        data,
        error
      } = await supabase.storage.from('product-images').upload(fileName, file);
      if (error) throw error;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('product-images').getPublicUrl(fileName);
      const newImage: ProductImage = {
        url: publicUrl,
        order_index: images.length,
        is_main: images.length === 0
      };
      setImages([...images, newImage]);
      toast.success(t('image_uploaded_successfully'));
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(t('failed_upload_image'));
    } finally {
      setUploadingImage(false);
    }
  };
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages.map((img, i) => ({
      ...img,
      order_index: i
    })));
  };
  const setMainImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_main: i === index
    }));
    setImages(newImages);
  };

  // Parameter handling functions
  const addParameter = () => {
    if (!newParam.name.trim() || !newParam.value.trim()) return;
    const parameter: ProductParam = {
      name: newParam.name,
      value: newParam.value,
      order_index: parameters.length
    };
    setParameters([...parameters, parameter]);
    setNewParam({
      name: '',
      value: ''
    });
  };
  const removeParameter = (index: number) => {
    const newParams = parameters.filter((_, i) => i !== index);
    setParameters(newParams.map((param, i) => ({
      ...param,
      order_index: i
    })));
  };
  const updateParameter = (index: number, field: 'name' | 'value', value: string) => {
    const newParams = [...parameters];
    newParams[index] = {
      ...newParams[index],
      [field]: value
    };
    setParameters(newParams);
  };
  return <div className="container mx-auto p-6 max-w-7xl" data-testid="productFormTabs_container">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product ? t('edit_product') : t('create_new_product')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3" data-testid="productFormTabs_tabsList">
              <TabsTrigger value="info" className="flex items-center gap-2" data-testid="productFormTabs_infoTab">
                <Package className="h-4 w-4" />
                {t('product_tab_main')}
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2" data-testid="productFormTabs_imagesTab">
                <ImageIcon className="h-4 w-4" />
                {t('product_tab_images')}
              </TabsTrigger>
              <TabsTrigger value="params" className="flex items-center gap-2" data-testid="productFormTabs_paramsTab">
                <Settings className="h-4 w-4" />
                {t('product_tab_parameters')}
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Information */}
            <TabsContent value="info" className="space-y-6" data-testid="productFormTabs_infoContent">
              {/* Основной контейнер с каруселью слева и полями справа */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Карусель фото - левая часть (2 колонки из 5) */}
                <div className="lg:col-span-2">
                  <div className="space-y-4">
                    <Label>{t('product_photos')}</Label>
                    <div className="w-full">
                      <Carousel className="w-full">
                        <CarouselContent>
                          {images.length > 0 ? images.map((image, index) => <CarouselItem key={index}>
                                <div className="aspect-square">
                                  <img src={image.url} alt={image.alt_text || `Фото ${index + 1}`} className="w-full h-full object-cover rounded-lg border" data-testid={`productFormTabs_carouselImage_${index}`} />
                                </div>
                              </CarouselItem>) : <CarouselItem>
                              <div className="aspect-square flex items-center justify-center">
                                <ProductPlaceholder className="w-full h-full" />
                              </div>
                            </CarouselItem>}
                        </CarouselContent>
                        {images.length > 1 && <>
                            <CarouselPrevious />
                            <CarouselNext />
                          </>}
                      </Carousel>
                    </div>
                  </div>
                </div>

                {/* Поля справа от карусели (3 колонки из 5) */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Секция: Основні дані */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{t('product_main_data')}</h3>
                      <Separator className="flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="store_id">{t('store')} *</Label>
                        <Select value={formData.store_id} onValueChange={value => setFormData({
                        ...formData,
                        store_id: value
                      })}>
                          <SelectTrigger data-testid="productFormTabs_storeSelect">
                            <SelectValue placeholder={t('select_store')} />
                          </SelectTrigger>
                          <SelectContent>
                            {stores.map(store => <SelectItem key={store.id} value={store.id}>
                                {store.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="supplier_id">{t('supplier')}</Label>
                        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                          <SelectTrigger data-testid="productFormTabs_supplierSelect">
                            <SelectValue placeholder={t('select_supplier')} />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.supplier_name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="external_id">{t('external_id')}</Label>
                        <Input id="external_id" value={formData.external_id} onChange={e => setFormData({
                        ...formData,
                        external_id: e.target.value
                      })} placeholder={t('external_id_placeholder')} data-testid="productFormTabs_externalIdInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="article">{t('article')}</Label>
                        <Input id="article" value={formData.article} onChange={e => setFormData({
                        ...formData,
                        article: e.target.value
                      })} placeholder={t('article_placeholder')} data-testid="productFormTabs_articleInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sku">{t('sku')}</Label>
                        <Input id="sku" value={formData.sku} onChange={e => setFormData({
                        ...formData,
                        sku: e.target.value
                      })} placeholder={t('sku_placeholder')} data-testid="productFormTabs_skuInput" />
                      </div>
                    </div>
                  </div>

                  {/* Секция: Назви та опис */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{t('product_names_description')}</h3>
                      <Separator className="flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name_ua">{t('product_name_ua')} *</Label>
                        <Input id="name_ua" value={formData.name_ua} onChange={e => setFormData({
                        ...formData,
                        name_ua: e.target.value
                      })} placeholder={t('product_name_ua_placeholder')} data-testid="productFormTabs_nameUaInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">{t('product_name_en')}</Label>
                        <Input id="name" value={formData.name} onChange={e => setFormData({
                        ...formData,
                        name: e.target.value
                      })} placeholder={t('product_name_en_placeholder')} data-testid="productFormTabs_nameInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description_ua">{t('product_description_ua')}</Label>
                        <Textarea id="description_ua" value={formData.description_ua} onChange={e => setFormData({
                        ...formData,
                        description_ua: e.target.value
                      })} placeholder={t('product_description_ua_placeholder')} rows={3} data-testid="productFormTabs_descriptionUaInput" />
                      </div>

                      
                    </div>
                  </div>

                  {/* Секция: Виробник та бренд */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{t('manufacturer_brand')}</h3>
                      <Separator className="flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor">{t('manufacturer')}</Label>
                        <Input id="vendor" value={formData.vendor} onChange={e => setFormData({
                        ...formData,
                        vendor: e.target.value
                      })} placeholder={t('manufacturer_placeholder')} data-testid="productFormTabs_vendorInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="brand">{t('brand')}</Label>
                        <Input id="brand" value={formData.brand} onChange={e => setFormData({
                        ...formData,
                        brand: e.target.value
                      })} placeholder={t('brand_placeholder')} data-testid="productFormTabs_brandInput" />
                      </div>
                    </div>
                  </div>

                  {/* Секция: Категорія та ціни */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{t('category_prices')}</h3>
                      <Separator className="flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category_id">{t('category')} *</Label>
                        <Select value={formData.category_id} onValueChange={value => setFormData({
                        ...formData,
                        category_id: value
                      })}>
                          <SelectTrigger data-testid="productFormTabs_categorySelect">
                            <SelectValue placeholder={t('select_category')} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency_id">{t('currency')} *</Label>
                        <Select value={formData.currency_id} onValueChange={value => setFormData({
                        ...formData,
                        currency_id: value
                      })}>
                          <SelectTrigger data-testid="productFormTabs_currencySelect">
                            <SelectValue placeholder={t('select_currency')} />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map(currency => <SelectItem key={currency.id} value={currency.id}>
                                {currency.name} ({currency.code})
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price">Ціна *</Label>
                        <Input id="price" type="number" step="0.01" value={formData.price} onChange={e => setFormData({
                        ...formData,
                        price: parseFloat(e.target.value) || 0
                      })} placeholder="0.00" data-testid="productFormTabs_priceInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price_old">Стара ціна</Label>
                        <Input id="price_old" type="number" step="0.01" value={formData.price_old} onChange={e => setFormData({
                        ...formData,
                        price_old: parseFloat(e.target.value) || 0
                      })} placeholder="0.00" data-testid="productFormTabs_priceOldInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price_promo">Промо ціна</Label>
                        <Input id="price_promo" type="number" step="0.01" value={formData.price_promo} onChange={e => setFormData({
                        ...formData,
                        price_promo: parseFloat(e.target.value) || 0
                      })} placeholder="0.00" data-testid="productFormTabs_pricePromoInput" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stock_quantity">Кількість на складі</Label>
                        <Input id="stock_quantity" type="number" value={formData.stock_quantity} onChange={e => setFormData({
                        ...formData,
                        stock_quantity: parseInt(e.target.value) || 0
                      })} placeholder="0" data-testid="productFormTabs_stockInput" />
                      </div>
                    </div>
                  </div>

                  {/* Секция: Додаткова інформація */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">Додаткова інформація</h3>
                      <Separator className="flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="state">{t('product_status')}</Label>
                        <Select value={formData.state} onValueChange={value => setFormData({
                        ...formData,
                        state: value
                      })}>
                          <SelectTrigger data-testid="productFormTabs_stateSelect">
                            <SelectValue placeholder={t('select_status')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">{t('status_new')}</SelectItem>
                            <SelectItem value="active">{t('status_active')}</SelectItem>
                            <SelectItem value="inactive">{t('status_inactive')}</SelectItem>
                            <SelectItem value="archived">{t('status_archived')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="url">{t('product_url')}</Label>
                        <Input id="url" value={formData.url} onChange={e => setFormData({
                        ...formData,
                        url: e.target.value
                      })} placeholder="https://example.com/product" data-testid="productFormTabs_urlInput" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Images */}
            <TabsContent value="images" className="space-y-6" data-testid="productFormTabs_imagesContent">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="imageUrl">{t('add_image_by_url')}</Label>
                    <div className="flex gap-2 mt-2">
                      <Input id="imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" data-testid="productFormTabs_imageUrlInput" />
                      <Button onClick={addImageFromUrl} variant="outline" size="icon" data-testid="productFormTabs_addImageUrlButton">
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <Label>{t('upload_file')}</Label>
                    <div className="mt-2">
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="fileUpload" data-testid="productFormTabs_fileInput" />
                      <Button onClick={() => document.getElementById('fileUpload')?.click()} variant="outline" disabled={uploadingImage} data-testid="productFormTabs_uploadButton">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingImage ? 'Загрузка...' : 'Выбрать файл'}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => <Card key={index} className="relative group" data-testid={`productFormTabs_imageCard_${index}`}>
                      <CardContent className="p-2">
                        <div className="aspect-square relative overflow-hidden rounded-md">
                          <img src={image.url} alt={image.alt_text || `Изображение ${index + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" variant={image.is_main ? "default" : "secondary"} onClick={() => setMainImage(index)} data-testid={`productFormTabs_setMainButton_${index}`}>
                              {image.is_main ? 'Главное' : 'Сделать главным'}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => removeImage(index)} data-testid={`productFormTabs_removeImageButton_${index}`}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {image.is_main && <Badge className="absolute top-2 left-2" variant="default">
                            Главное
                          </Badge>}
                      </CardContent>
                    </Card>)}
                </div>

                {images.length === 0 && <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('no_images_added')}</p>
                    <p className="text-sm">{t('add_images_instruction')}</p>
                  </div>}
              </div>
            </TabsContent>

            {/* Tab 3: Parameters */}
            <TabsContent value="params" className="space-y-6" data-testid="productFormTabs_paramsContent">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="paramName">{t('characteristic_name')}</Label>
                    <Input id="paramName" value={newParam.name} onChange={e => setNewParam({
                    ...newParam,
                    name: e.target.value
                  })} placeholder="Например: Цвет, Размер, Материал" data-testid="productFormTabs_paramNameInput" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="paramValue">{t('value')}</Label>
                    <Input id="paramValue" value={newParam.value} onChange={e => setNewParam({
                    ...newParam,
                    value: e.target.value
                  })} placeholder={t('value_example')} data-testid="productFormTabs_paramValueInput" />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addParameter} disabled={!newParam.name.trim() || !newParam.value.trim()} data-testid="productFormTabs_addParamButton">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('add')}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {parameters.map((param, index) => <Card key={index} data-testid={`productFormTabs_paramCard_${index}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          <div className="flex-1">
                            <Label htmlFor={`param-name-${index}`}>{t('name')}</Label>
                            <Input id={`param-name-${index}`} value={param.name} onChange={e => updateParameter(index, 'name', e.target.value)} data-testid={`productFormTabs_paramNameEdit_${index}`} />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`param-value-${index}`}>{t('value')}</Label>
                            <Input id={`param-value-${index}`} value={param.value} onChange={e => updateParameter(index, 'value', e.target.value)} data-testid={`productFormTabs_paramValueEdit_${index}`} />
                          </div>
                          <div className="flex items-end">
                            <Button variant="outline" size="icon" onClick={() => removeParameter(index)} data-testid={`productFormTabs_removeParamButton_${index}`}>
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
                </div>

                {parameters.length === 0 && <div className="text-center py-12 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('no_characteristics_added')}</p>
                    <p className="text-sm">{t('add_characteristics_instruction')}</p>
                  </div>}
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Button variant="outline" onClick={handleCancel} data-testid="productFormTabs_cancelButton">
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !formData.name.trim()} data-testid="productFormTabs_submitButton">
              {loading ? 'Сохранение...' : product ? 'Обновить товар' : 'Создать товар'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
}