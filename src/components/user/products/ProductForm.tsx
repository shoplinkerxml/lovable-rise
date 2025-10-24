import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, X, Upload, Image as ImageIcon } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ProductService, type Product } from '@/lib/product-service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductFormProps {
  product?: Product | null;
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
}

export const ProductForm = ({ product, onSuccess, onCancel }: ProductFormProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    name_ua: '',
    description: '',
    description_ua: '',
    vendor: '',
    article: '',
    external_id: '',
    category_external_id: '',
    supplier_id: '',
    store_id: '',
    currency_code: 'UAH',
    price: '',
    price_old: '',
    price_promo: '',
    stock_quantity: '0',
    available: true,
    state: 'new',
    url: ''
  });

  const [params, setParams] = useState<ProductParam[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load suppliers
      const { data: suppliersData } = await (supabase as any)
        .from('user_suppliers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      setSuppliers(suppliersData || []);

      // Load stores
      const { data: storesData } = await (supabase as any)
        .from('user_stores')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      setStores(storesData || []);

      // Load currencies
      const { data: currenciesData } = await (supabase as any)
        .from('store_currencies')
        .select('*');
      setCurrencies(currenciesData || []);

      // Load categories
      const { data: categoriesData } = await (supabase as any)
        .from('store_categories')
        .select('*')
        .order('name');
      setCategories(categoriesData || []);
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

  const addImage = (url: string) => {
    setImages([...images, { url, order_index: images.length }]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Назва товару обов\'язкова');
      return;
    }

    if (!formData.supplier_id) {
      toast.error('Оберіть постачальника');
      return;
    }

    if (!formData.external_id) {
      toast.error('External ID обов\'язковий');
      return;
    }

    try {
      setLoading(true);
      toast.error('Функціонал створення товару ще в розробці');
      
      // TODO: Implement product creation with all related data
      // 1. Create product in store_products
      // 2. Create params in store_product_params
      // 3. Create images in store_product_images
      
    } catch (error: any) {
      console.error('Save product error:', error);
      toast.error(error?.message || 'Помилка збереження товару');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Name and Description */}
          <Card>
            <CardHeader>
              <CardTitle>Назва та опис</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="uk" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="uk">Українська</TabsTrigger>
                  <TabsTrigger value="ru">Російська</TabsTrigger>
                </TabsList>
                <TabsContent value="uk" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name_ua">Назва товару (UA)</Label>
                    <Input
                      id="name_ua"
                      value={formData.name_ua}
                      onChange={(e) => setFormData({ ...formData, name_ua: e.target.value })}
                      placeholder="Введіть назву українською"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_ua">Опис товару (UA)</Label>
                    <Textarea
                      id="description_ua"
                      value={formData.description_ua}
                      onChange={(e) => setFormData({ ...formData, description_ua: e.target.value })}
                      placeholder="Введіть опис українською"
                      rows={6}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="ru" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Назва товару (RU)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Введіть назву російською"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Опис товару (RU)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Введіть опис російською"
                      rows={6}
                      required
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Category */}
          <Card>
            <CardHeader>
              <CardTitle>Категорія</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Категорія товару</Label>
                <Select
                  value={formData.category_external_id}
                  onValueChange={(value) => setFormData({ ...formData, category_external_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть категорію" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.external_id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Product Parameters */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Характеристики товару</CardTitle>
              <Button type="button" size="sm" onClick={addParam}>
                <Plus className="h-4 w-4 mr-2" />
                Додати
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {params.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Характеристики не додані
                  </p>
                ) : (
                  params.map((param, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2">
                      <Input
                        placeholder="Назва"
                        value={param.name}
                        onChange={(e) => updateParam(index, 'name', e.target.value)}
                        className="col-span-2"
                      />
                      <Input
                        placeholder="Значення"
                        value={param.value}
                        onChange={(e) => updateParam(index, 'value', e.target.value)}
                        className="col-span-2"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeParam(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Manage Stock */}
          <Card>
            <CardHeader>
              <CardTitle>Управління товарними запасами</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="article">Артикул (SKU)</Label>
                  <Input
                    id="article"
                    value={formData.article}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                    placeholder="Введіть артикул"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="external_id">External ID *</Label>
                  <Input
                    id="external_id"
                    value={formData.external_id}
                    onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                    placeholder="Унікальний ID"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Кількість на складі</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Стан товару</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Новий</SelectItem>
                      <SelectItem value="used">Вживаний</SelectItem>
                      <SelectItem value="refurbished">Відновлений</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Product Details */}
          <Card>
            <CardHeader>
              <CardTitle>Деталі товару</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Виробник/Бренд</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Назва бренду"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Постачальник *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть постачальника" />
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
              <div className="space-y-2">
                <Label htmlFor="store_id">Магазин</Label>
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
                <Label htmlFor="url">URL товару</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Ціноутворення</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency_code">Валюта</Label>
                <Select
                  value={formData.currency_code}
                  onValueChange={(value) => setFormData({ ...formData, currency_code: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.code}>
                        {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Ціна *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_old">Стара ціна</Label>
                  <Input
                    id="price_old"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_old}
                    onChange={(e) => setFormData({ ...formData, price_old: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_promo">Акційна ціна</Label>
                <Input
                  id="price_promo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_promo}
                  onChange={(e) => setFormData({ ...formData, price_promo: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle>Зображення товару</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Перетягніть зображення або натисніть для вибору
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    Вибрати файли
                  </Button>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={`Product ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Скасувати
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Зберегти товар
        </Button>
      </div>
    </form>
  );
};
