import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X, Upload, Link } from "lucide-react";
import { toast } from "sonner";
import { ProductService } from "@/lib/product-service";
import { SupplierService } from "@/lib/supplier-service";
import { supabase } from "@/integrations/supabase/client";

interface ProductFormProps {
  product?: any | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ProductParam {
  name: string;
  value: string;
  order_index: number;
}

interface ProductImage {
  url: string;
  order_index: number;
  alt_text?: string;
  is_main?: boolean;
}

export const ProductForm = ({ product, onSuccess, onCancel }: ProductFormProps) => {
  const [loading, setLoading] = useState(false);
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
    category_id: '',
    currency_id: '',
    
    // Товарна інформація
    vendor: '',
    brand: '',
    article: '',
    sku: '',
    
    // Ціни
    price: '',
    price_old: '',
    price_promo: '',
    
    // Склад та статус
    stock_quantity: '',
    available: true,
    state: 'active',
    url: ''
  });
  
  const [params, setParams] = useState<ProductParam[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  useEffect(() => {
    loadInitialData();
    if (product) {
      loadProductData();
    }
  }, [product]);

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
        category_id: product.category_id || '',
        currency_id: product.currency_id || '',
        vendor: product.vendor || '',
        brand: product.brand || '',
        article: product.article || '',
        sku: product.sku || '',
        price: product.price?.toString() || '',
        price_old: product.price_old?.toString() || '',
        price_promo: product.price_promo?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        available: product.available ?? true,
        state: product.state || 'active',
        url: product.url || ''
      });

      // Load product params
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: paramsData } = await (supabase as any)
        .from('store_product_params')
        .select('*')
        .eq('product_id', product.id)
        .order('order_index');
      setParams(paramsData || []);

      // Load product images
      const { data: imagesData } = await (supabase as any)
        .from('store_product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('order_index');
      setImages(imagesData?.map((img: any) => ({ 
        url: img.url, 
        order_index: img.order_index,
        alt_text: img.alt_text,
        is_main: img.is_main
      })) || []);
    } catch (error) {
      console.error('Load product data error:', error);
      toast.error('Помилка завантаження даних товару');
    }
  };

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load stores
      const storesData = await ProductService.getUserStores();
      setStores(storesData || []);

      // Load suppliers
      const suppliersData = await SupplierService.getSuppliers();
      setSuppliers(suppliersData || []);

      // Load currencies from global currencies table
      const { data: currenciesData, error: currenciesError } = await (supabase as any)
        .from('currencies')
        .select('*')
        .eq('status', true)
        .order('name');
      
      if (currenciesError) {
        console.error('Error loading currencies:', currenciesError);
        setCurrencies([]);
      } else {
        setCurrencies(currenciesData || []);
      }

      // Load categories for current user
      const { data: categoriesData, error: categoriesError } = await (supabase as any)
        .from('store_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (categoriesError) {
        console.error('Error loading store categories:', categoriesError);
        // Set empty categories array as fallback
        setCategories([]);
      } else {
        setCategories(categoriesData || []);
      }
    } catch (error) {
      console.error('Load initial data error:', error);
    }
  };

  const addParam = () => {
    setParams([...params, { name: '', value: '', order_index: params.length }]);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: 'name' | 'value', value: string) => {
    const newParams = [...params];
    newParams[index][field] = value;
    setParams(newParams);
  };

  const addImageByUrl = () => {
    if (!newImageUrl.trim()) {
      toast.error('Введіть URL зображення');
      return;
    }
    
    setImages([...images, { 
      url: newImageUrl.trim(), 
      order_index: images.length,
      is_main: images.length === 0
    }]);
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const setMainImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_main: i === index
    }));
    setImages(newImages);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Оберіть файл зображення');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Розмір файлу не повинен перевищувати 5MB');
      return;
    }

    try {
      setLoading(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setImages([...images, { 
        url: publicUrl, 
        order_index: images.length,
        is_main: images.length === 0
      }]);
      
      toast.success('Зображення завантажено');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Помилка завантаження зображення');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      // Allow custom input
      setFormData({ ...formData, category_id: '' });
    } else {
      setFormData({ ...formData, category_id: value });
      setCategoryInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Назва товару обов\'язкова');
      return;
    }

    if (!formData.store_id) {
      toast.error('Оберіть магазин');
      return;
    }

    if (!formData.external_id) {
      toast.error('External ID обов\'язковий');
      return;
    }

    try {
      setLoading(true);

      // Check product limit before creating new product
      if (!product) {
        const limitInfo = await ProductService.getProductLimit();
        if (!limitInfo.canCreate) {
          toast.error(`Досягнуто ліміт товарів: ${limitInfo.current}/${limitInfo.max}. Оновіть тарифний план для створення нових товарів.`);
          return;
        }
      }

      // Підготовуємо дані для створення товару
      const productData = {
        name: formData.name,
        name_ua: formData.name_ua || null,
        description: formData.description || null,
        description_ua: formData.description_ua || null,
        external_id: formData.external_id,
        store_id: formData.store_id,
        supplier_id: formData.supplier_id || null,
        category_id: formData.category_id || null,
        currency_id: formData.currency_id || null,
        vendor: formData.vendor || null,
        brand: formData.brand || null,
        article: formData.article || null,
        sku: formData.sku || null,
        price: formData.price ? parseFloat(formData.price) : null,
        price_old: formData.price_old ? parseFloat(formData.price_old) : null,
        price_promo: formData.price_promo ? parseFloat(formData.price_promo) : null,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
        available: formData.available,
        state: formData.state || 'active',
        url: formData.url || null,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Основна інформація</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Назва товару (рос.) *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введіть назву товару російською"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ua">Назва товару (укр.)</Label>
                  <Input
                    id="name_ua"
                    value={formData.name_ua}
                    onChange={(e) => setFormData({ ...formData, name_ua: e.target.value })}
                    placeholder="Введіть назву товару українською"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Опис товару (рос.)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Введіть опис товару російською"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_ua">Опис товару (укр.)</Label>
                <Textarea
                  id="description_ua"
                  value={formData.description_ua}
                  onChange={(e) => setFormData({ ...formData, description_ua: e.target.value })}
                  placeholder="Введіть опис товару українською"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="external_id">External ID *</Label>
                  <Input
                    id="external_id"
                    value={formData.external_id}
                    onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                    placeholder="Введіть External ID"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="article">Артикул</Label>
                  <Input
                    id="article"
                    value={formData.article}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                    placeholder="Введіть артикул"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Виробник</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Введіть виробника"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Бренд</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Введіть бренд"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Введіть SKU"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL товару</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="Введіть URL товару"
                  type="url"
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle>Зображення товару</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add image by URL */}
              <div className="flex gap-2">
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Введіть URL зображення"
                  className="flex-1"
                />
                <Button type="button" onClick={addImageByUrl} size="sm" variant="outline">
                  <Link className="h-4 w-4 mr-2" />
                  Додати URL
                </Button>
              </div>

              {/* Upload image file */}
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Завантажити
                </Button>
              </div>

              {/* Images list */}
              {images.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Зображення не додані
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          onClick={() => setMainImage(index)}
                          size="sm"
                          variant={image.is_main ? "default" : "secondary"}
                        >
                          {image.is_main ? "Головне" : "Зробити головним"}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => removeImage(index)}
                          size="sm"
                          variant="destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Параметри товару
                <Button type="button" onClick={addParam} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Додати параметр
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {params.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Параметри не додані
                </p>
              ) : (
                <div className="space-y-3">
                  {params.map((param, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor={`param-name-${index}`}>Назва</Label>
                        <Input
                          id={`param-name-${index}`}
                          value={param.name}
                          onChange={(e) => updateParam(index, 'name', e.target.value)}
                          placeholder="Назва параметру"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`param-value-${index}`}>Значення</Label>
                        <Input
                          id={`param-value-${index}`}
                          value={param.value}
                          onChange={(e) => updateParam(index, 'value', e.target.value)}
                          placeholder="Значення параметру"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => removeParam(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Settings */}
        <div className="space-y-6">
          {/* Store and Supplier */}
          <Card>
            <CardHeader>
              <CardTitle>Магазин та постачальник</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store">Магазин *</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value) => setFormData({ ...formData, store_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть магазин" />
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
                <Label htmlFor="supplier">Постачальник</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть постачальника" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Category */}
          <Card>
            <CardHeader>
              <CardTitle>Категорія</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Категорія</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть категорію або введіть власну" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Ввести власну категорію</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!formData.category_id && (
                <div className="space-y-2">
                  <Label htmlFor="category_input">Власна категорія</Label>
                  <Input
                    id="category_input"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    placeholder="Введіть назву категорії"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price and Currency */}
          <Card>
            <CardHeader>
              <CardTitle>Ціни та валюта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <Select
                  value={formData.currency_id}
                  onValueChange={(value) => setFormData({ ...formData, currency_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть валюту" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Поточна ціна</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_old">Стара ціна</Label>
                <Input
                  id="price_old"
                  type="number"
                  step="0.01"
                  value={formData.price_old}
                  onChange={(e) => setFormData({ ...formData, price_old: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_promo">Акційна ціна</Label>
                <Input
                  id="price_promo"
                  type="number"
                  step="0.01"
                  value={formData.price_promo}
                  onChange={(e) => setFormData({ ...formData, price_promo: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Stock and Status */}
          <Card>
            <CardHeader>
              <CardTitle>Склад та статус</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Кількість на складі</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Статус товару</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активний</SelectItem>
                    <SelectItem value="inactive">Неактивний</SelectItem>
                    <SelectItem value="draft">Чернетка</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="available">Товар доступний</Label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? 'Оновити товар' : 'Створити товар'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Скасувати
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
