import { supabase } from "@/integrations/supabase/client";
import { R2Storage } from "@/lib/r2-storage";
import { SessionValidator } from "./session-validation";
import { SubscriptionValidationService } from "./subscription-validation-service";

export interface Product {
  id: string;
  store_id: string;
  supplier_id?: number | null;
  external_id: string;
  name: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: string | null;
  category_external_id?: string | null;
  currency_id?: string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity: number;
  available: boolean;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface ProductParam {
  id?: string;
  product_id?: string;
  name: string;
  value: string;
  order_index: number;
  paramid?: string;
  valueid?: string;
}

export interface ProductImage {
  id?: string;
  product_id?: string;
  url: string;
  order_index: number;
  is_main?: boolean;
}

export interface CreateProductData {
  store_id?: string;
  external_id: string;
  name: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: string | null;
  category_external_id?: string | null;
  supplier_id?: number | string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity?: number;
  available?: boolean;
  state?: string;
  params?: ProductParam[];
  images?: ProductImage[];
}

export interface UpdateProductData {
  store_id?: string;
  external_id?: string;
  name?: string;
  name_ua?: string | null;
  docket?: string | null;
  docket_ua?: string | null;
  description?: string | null;
  description_ua?: string | null;
  vendor?: string | null;
  article?: string | null;
  category_id?: string | null;
  category_external_id?: string | null;
  supplier_id?: number | string | null;
  currency_code?: string | null;
  price?: number | null;
  price_old?: number | null;
  price_promo?: number | null;
  stock_quantity?: number;
  available?: boolean;
  state?: string;
  params?: ProductParam[];
  images?: ProductImage[];
}

export interface ProductLimitInfo {
  current: number;
  max: number;
  canCreate: boolean;
}

export class ProductService {
  /** Получение store_ids текущего пользователя */
  private static async getUserStoreIds(): Promise<string[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_stores')
        .select('id')
        .eq('user_id', sessionValidation.user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Get user stores error:', error);
        return [];
      }

      return (data || []).map((store: any) => store.id);
    } catch (error) {
      console.error('Get user stores error:', error);
      return [];
    }
  }

  /** Получение полной информации о магазинах пользователя */
  static async getUserStores(): Promise<any[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('user_stores')
      .select('id, user_id, store_name, store_url, template_id, custom_mapping, xml_config, is_active, created_at, updated_at, last_sync')
      .eq('user_id', sessionValidation.user.id)
      .eq('is_active', true)
      .order('store_name');

    if (error) {
      console.error('Get user stores error:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Получение продуктов для конкретного магазина с учётом переопределений из store_product_links */
  static async getProductsForStore(storeId: string): Promise<Product[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_product_links')
      .select('product_id,store_id,is_active,custom_name,custom_description,custom_price,custom_price_promo,custom_stock_quantity,store_products(*)')
      .eq('store_id', storeId);

    if (error) {
      console.error('Get products for store error:', error);
      return [];
    }

    const rows = (data || []) as any[];
    const mapped: Product[] = rows.map((r: any) => {
      const base = r.store_products || {};
      return {
        id: String(base.id),
        store_id: String(r.store_id || base.store_id),
        supplier_id: base.supplier_id ?? null,
        external_id: base.external_id,
        name: r.custom_name ?? base.name,
        name_ua: base.name_ua ?? null,
        docket: base.docket ?? null,
        docket_ua: base.docket_ua ?? null,
        description: r.custom_description ?? base.description ?? null,
        description_ua: base.description_ua ?? null,
        vendor: base.vendor ?? null,
        article: base.article ?? null,
        category_id: base.category_id ?? null,
        category_external_id: base.category_external_id ?? null,
        currency_id: base.currency_id ?? null,
        currency_code: base.currency_code ?? null,
        price: r.custom_price ?? base.price ?? null,
        price_old: base.price_old ?? null,
        price_promo: r.custom_price_promo ?? base.price_promo ?? null,
        stock_quantity: (r.custom_stock_quantity ?? base.stock_quantity ?? 0) as number,
        available: (base.available ?? true) as boolean,
        state: base.state ?? 'new',
        created_at: base.created_at ?? new Date().toISOString(),
        updated_at: base.updated_at ?? new Date().toISOString(),
      };
    });

    return mapped;
  }

  /** Получить и обновить переопределения для пары (product_id, store_id) */
  static async getStoreProductLink(productId: string, storeId: string): Promise<any | null> {
    const { data, error } = await (supabase as any)
      .from('store_product_links')
      .select('*')
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      console.error('Get store product link error:', error);
    }
    return data || null;
  }

  static async updateStoreProductLink(productId: string, storeId: string, patch: any): Promise<any> {
    const { data, error } = await (supabase as any)
      .from('store_product_links')
      .update(patch)
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('Update store product link error:', error);
      throw new Error(error.message);
    }
    return data;
  }

  static async removeStoreProductLink(productId: string, storeId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('store_product_links')
      .delete()
      .eq('product_id', productId)
      .eq('store_id', storeId);
    if (error) {
      console.error('Delete store product link error:', error);
      throw new Error(error.message);
    }
  }

  /** Получение только максимального лимита продуктов (без подсчета текущих) */
  static async getProductLimitOnly(): Promise<number> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Use cached/validated subscription to avoid duplicate requests
    const subscription = await SubscriptionValidationService.getValidSubscription(user.id);
    if (!subscription) {
      return 0;
    }
    const tariffId = subscription.tariffs?.id ?? subscription.tariff_id;
    if (!tariffId) {
      return 0;
    }

    // Get the product limit directly from tariff_limits by limit_name
    const { data: limitData, error: limitError } = await supabase
      .from('tariff_limits')
      .select('value')
      .eq('tariff_id', tariffId)
      .ilike('limit_name', '%товар%')
      .eq('is_active', true)
      .maybeSingle();

    if (limitError) {
      console.error('Error fetching tariff limit:', limitError);
      return 0;
    }

    return limitData?.value || 0;
  }

  /** Получение лимита продуктов для текущего пользователя */
  static async getProductLimit(): Promise<ProductLimitInfo> {
    const maxProducts = await this.getProductLimitOnly();
    const currentCount = await this.getProductsCount();

    return {
      current: currentCount,
      max: maxProducts,
      canCreate: currentCount < maxProducts
    };
  }

  /** Получение количества продуктов текущего пользователя */
  static async getProductsCount(): Promise<number> {
    try {
      const sessionValidation = await SessionValidator.ensureValidSession();
      if (!sessionValidation.isValid) {
        throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
      }

      const { count, error } = await (supabase as any)
        .from('store_products')
        .select('id', { count: 'exact', head: true })
        // RLS should restrict rows to the current user's stores; no explicit user_id column
        // Keep the query simple to avoid referencing non-existent columns
        .order('id', { ascending: true });

      if (error) {
        console.error('Get products count error:', error);
        // Возвращаем 0 вместо выброса ошибки для случая пустой таблицы
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Get products count error (table may not exist):', error);
      // Возвращаем 0 если таблица не существует или нет доступа
      return 0;
    }
  }

  /** Получение списка продуктов текущего пользователя */
  static async getProducts(): Promise<Product[]> {
    try {
      const sessionValidation = await SessionValidator.ensureValidSession();
      if (!sessionValidation.isValid) {
        throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
      }

      const { data, error } = await (supabase as any)
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get products error:', error);
        // Возвращаем пустой массив вместо выброса ошибки для случая пустой таблицы
        return [];
      }

      const rows: any[] = data || [];
      // Fallback: если колонок docket/docket_ua нет в таблице, читаем значения из store_product_params
      const ids = rows.map((r: any) => r?.id).filter((v) => !!v);
      if (ids.length > 0) {
        const { data: paramRows, error: paramsErr } = await (supabase as any)
          .from('store_product_params')
          .select('product_id,name,value')
          .in('product_id', ids)
          .in('name', ['docket', 'docket_ua']);
        if (!paramsErr && Array.isArray(paramRows)) {
          const map: Record<string, Record<string, string>> = {};
          for (const pr of paramRows) {
            const pid = String(pr.product_id);
            if (!map[pid]) map[pid] = {} as any;
            map[pid][pr.name] = pr.value;
          }
          rows.forEach((r: any) => {
            const pid = String(r.id);
            if ((r.docket == null || r.docket === '') && map[pid]?.docket) {
              r.docket = map[pid].docket;
            }
            if ((r.docket_ua == null || r.docket_ua === '') && map[pid]?.docket_ua) {
              r.docket_ua = map[pid].docket_ua;
            }
          });
        }
      }

      return rows as Product[];
    } catch (error) {
      console.error('Get products error (table may not exist):', error);
      // Возвращаем пустой массив если таблица не существует или нет доступа
      return [];
    }
  }

  /** Получение параметров товара */
  static async getProductParams(productId: string): Promise<ProductParam[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_product_params')
      .select('*')
      .eq('product_id', productId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Get product params error:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Получение изображений товара */
  static async getProductImages(productId: string): Promise<ProductImage[]> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_product_images')
      .select('*')
      .eq('product_id', productId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Get product images error:', error);
      throw new Error(error.message);
    }

    return data || [];
  }

  /** Получение товара по ID */
  static async getProductById(id: string): Promise<Product | null> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    const { data, error } = await (supabase as any)
      .from('store_products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Товар не найден
      }
      console.error('Get product by ID error:', error);
      throw new Error(error.message);
    }

    const product: any = data;
    // Fallback: читаем возможные значения docket/docket_ua из параметров, если отсутствуют в основной таблице
    try {
      const { data: paramRows } = await (supabase as any)
        .from('store_product_params')
        .select('name,value')
        .eq('product_id', product.id)
        .in('name', ['docket', 'docket_ua']);
      (paramRows || []).forEach((pr: any) => {
        if (pr.name === 'docket' && (product.docket == null || product.docket === '')) {
          product.docket = pr.value;
        }
        if (pr.name === 'docket_ua' && (product.docket_ua == null || product.docket_ua === '')) {
          product.docket_ua = pr.value;
        }
      });
    } catch (_) {
      // ignore
    }

    return product as Product;
  }

  /** Получение одного продукта по ID - используем getProductById */
  static async getProduct(id: string): Promise<Product> {
    const product = await this.getProductById(id);
    if (!product) {
      throw new Error("Товар не найден");
    }
    return product;
  }

  /** Создание нового продукта */
  static async createProduct(productData: CreateProductData): Promise<Product> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // Determine effective store_id: use provided or first active user store
    let effectiveStoreId = productData.store_id;
    if (!effectiveStoreId || effectiveStoreId.trim() === '') {
      const storeIds = await this.getUserStoreIds();
      effectiveStoreId = storeIds[0];
      if (!effectiveStoreId) {
        throw new Error("Активний магазин не знайдено");
      }
    }

    // Проверка лимита перед созданием товара (включая дублирование)
    const limitInfo = await this.getProductLimit();
    if (!limitInfo.canCreate) {
      // Сообщение об ошибке будет отображено на UI через i18n
      throw new Error("Ліміт товарів вичерпано");
    }

    // Подготавливаем данные для создания товара
    const productInsertData = {
      store_id: effectiveStoreId,
      supplier_id: productData.supplier_id !== undefined && productData.supplier_id !== null ? Number(productData.supplier_id) : undefined,
      external_id: productData.external_id,
      name: productData.name,
      name_ua: productData.name_ua,
      docket: productData.docket,
      docket_ua: productData.docket_ua,
      description: productData.description,
      description_ua: productData.description_ua,
      vendor: productData.vendor,
      article: productData.article,
      category_external_id: productData.category_external_id ?? null,
      currency_code: productData.currency_code ?? null,
      price: productData.price,
      price_old: productData.price_old,
      price_promo: productData.price_promo,
      stock_quantity: productData.stock_quantity || 0,
      available: productData.available !== false,
      state: productData.state || 'new'
    };

    // Создаем товар
    const { data: product, error: productError } = await (supabase as any)
      .from('store_products')
      .insert([productInsertData])
      .select()
      .single();

    if (productError) {
      console.error('Create product error:', productError);
      throw new Error(productError.message);
    }

    // Создаем параметры товара, если они есть
    if (productData.params && productData.params.length > 0) {
      const paramsData = productData.params.map((param, index) => ({
        product_id: product.id,
        name: param.name,
        value: param.value,
        order_index: param.order_index || index,
        paramid: param.paramid || null,
        valueid: param.valueid || null
      }));

      const { error: paramsError } = await (supabase as any)
        .from('store_product_params')
        .insert(paramsData);

      if (paramsError) {
        console.error('Create product params error:', paramsError);
        // Не прерываем выполнение, просто логируем ошибку
      }
    }

    // Fallback-параметры для docket/docket_ua, если соответствующих колонок нет
    try {
      const fallbackParams: any[] = [];
      if (productInsertData.docket_ua != null && String(productInsertData.docket_ua).trim() !== '') {
        fallbackParams.push({ product_id: product.id, name: 'docket_ua', value: String(productInsertData.docket_ua), order_index: 0 });
      }
      if (productInsertData.docket != null && String(productInsertData.docket).trim() !== '') {
        fallbackParams.push({ product_id: product.id, name: 'docket', value: String(productInsertData.docket), order_index: fallbackParams.length });
      }
      if (fallbackParams.length > 0) {
        await (supabase as any)
          .from('store_product_params')
          .insert(fallbackParams);
      }
    } catch (e) {
      console.warn('Fallback params insert failed:', e);
    }

    // Создаем изображения товара, если они есть
    if (productData.images && productData.images.length > 0) {
      // Нормализуем флаг главного изображения: должно быть ровно одно is_main=true
      const hasExplicitMain = productData.images.some(img => img.is_main === true);
      let mainAssigned = false;

      const imagesData = productData.images.map((image, index) => {
        let isMain: boolean;
        if (hasExplicitMain) {
          if (image.is_main === true && !mainAssigned) {
            isMain = true;
            mainAssigned = true;
          } else {
            isMain = false;
          }
        } else {
          isMain = index === 0;
        }

        return {
          product_id: product.id,
          url: image.url,
          order_index: image.order_index || index,
          is_main: isMain
        };
      });

      const { error: imagesError } = await (supabase as any)
        .from('store_product_images')
        .insert(imagesData);

      if (imagesError) {
        console.error('Create product images error:', imagesError);
        // Не прерываем выполнение, просто логируем ошибку
      }
    }

    return product;
  }

  /** Дублирование продукта с новым ID и копированием параметров и изображений */
  static async duplicateProduct(id: string): Promise<Product> {
    // 1. Получаем оригинальный продукт
    const original = await this.getProductById(id);
    if (!original) {
      throw new Error("Товар не найден");
    }

    // 2. Загружаем связанные параметры и изображения
    const [params, images] = await Promise.all([
      this.getProductParams(original.id),
      this.getProductImages(original.id),
    ]);

    // 3. Формируем данные для создания нового товара (идентичные поля, новый id сгенерируется БД)
    const duplicateData: CreateProductData = {
      store_id: original.store_id,
      supplier_id: original.supplier_id ?? null,
      external_id: original.external_id,
      name: original.name,
      name_ua: original.name_ua ?? null,
      docket: original.docket ?? null,
      docket_ua: original.docket_ua ?? null,
      description: original.description ?? null,
      description_ua: original.description_ua ?? null,
      vendor: original.vendor ?? null,
      article: original.article ?? null,
      category_id: original.category_id ?? null,
      category_external_id: original.category_external_id ?? null,
      currency_code: original.currency_code ?? null,
      price: original.price ?? null,
      price_old: original.price_old ?? null,
      price_promo: original.price_promo ?? null,
      stock_quantity: original.stock_quantity,
      available: original.available,
      state: original.state,
      params: (params || []).map((p, idx) => ({
        name: p.name,
        value: p.value,
        order_index: p.order_index ?? idx,
        paramid: p.paramid ?? null,
        valueid: p.valueid ?? null,
      })),
      images: (images || []).map((img, idx) => ({
        url: img.url,
        order_index: img.order_index ?? idx,
        is_main: (img as any).is_main ?? (idx === 0)
      })),
    };

    try {
      // 4. Создаем новый товар с теми же данными
      const created = await this.createProduct(duplicateData);
      return created;
    } catch (error: any) {
      // Если сработало уникальное ограничение, пробуем скорректировать external_id
      const msg = String(error?.message || "");
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("constraint")) {
        const fallback: CreateProductData = { ...duplicateData, external_id: `${original.external_id}-copy-${Math.floor(Math.random()*1000)}` };
        const created = await this.createProduct(fallback);
        return created;
      }
      throw error;
    }
  }

  /** Обновление товара */
  static async updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // Подготавливаем данные для обновления товара
    const productUpdateData: any = {};
    
    if (productData.store_id !== undefined) productUpdateData.store_id = productData.store_id;
    if (productData.external_id !== undefined) productUpdateData.external_id = productData.external_id;
    if (productData.name !== undefined) productUpdateData.name = productData.name;
    if (productData.name_ua !== undefined) productUpdateData.name_ua = productData.name_ua;
    if (productData.docket !== undefined) productUpdateData.docket = productData.docket;
    if (productData.docket_ua !== undefined) productUpdateData.docket_ua = productData.docket_ua;
    if (productData.description !== undefined) productUpdateData.description = productData.description;
    if (productData.description_ua !== undefined) productUpdateData.description_ua = productData.description_ua;
    if (productData.vendor !== undefined) productUpdateData.vendor = productData.vendor;
    if (productData.article !== undefined) productUpdateData.article = productData.article;
    if (productData.category_id !== undefined) productUpdateData.category_id = productData.category_id;
    if (productData.category_external_id !== undefined) productUpdateData.category_external_id = productData.category_external_id;
    if (productData.supplier_id !== undefined) productUpdateData.supplier_id = productData.supplier_id !== null ? Number(productData.supplier_id) : null;
    if (productData.currency_code !== undefined) productUpdateData.currency_code = productData.currency_code;
    if (productData.price !== undefined) productUpdateData.price = productData.price;
    if (productData.price_old !== undefined) productUpdateData.price_old = productData.price_old;
    if (productData.price_promo !== undefined) productUpdateData.price_promo = productData.price_promo;
    if (productData.stock_quantity !== undefined) productUpdateData.stock_quantity = productData.stock_quantity;
    if (productData.available !== undefined) productUpdateData.available = productData.available;
    if (productData.state !== undefined) productUpdateData.state = productData.state;

    // Обновляем товар
    const { data: product, error: productError } = await (supabase as any)
      .from('store_products')
      .update(productUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      console.error('Update product error:', productError);
      throw new Error(productError.message);
    }

    // Fallback: синхронизируем docket/docket_ua в store_product_params
    try {
      // Удаляем прежние значения для избежания дублей
      await (supabase as any)
        .from('store_product_params')
        .delete()
        .eq('product_id', id)
        .in('name', ['docket', 'docket_ua']);
      const inserts: any[] = [];
      if (productUpdateData.docket_ua !== undefined && productUpdateData.docket_ua !== null && String(productUpdateData.docket_ua).trim() !== '') {
        inserts.push({ product_id: id, name: 'docket_ua', value: String(productUpdateData.docket_ua), order_index: 0 });
      }
      if (productUpdateData.docket !== undefined && productUpdateData.docket !== null && String(productUpdateData.docket).trim() !== '') {
        inserts.push({ product_id: id, name: 'docket', value: String(productUpdateData.docket), order_index: inserts.length });
      }
      if (inserts.length > 0) {
        await (supabase as any)
          .from('store_product_params')
          .insert(inserts);
      }
    } catch (e) {
      console.warn('Fallback params update failed:', e);
    }

    // Обновляем параметры товара, если они переданы
    if (productData.params !== undefined) {
      // Удаляем старые параметры
      await (supabase as any)
        .from('store_product_params')
        .delete()
        .eq('product_id', id);

      // Добавляем новые параметры
      if (productData.params.length > 0) {
        const paramsData = productData.params.map((param, index) => ({
          product_id: id,
          name: param.name,
          value: param.value,
          order_index: param.order_index || index,
          paramid: param.paramid || null,
          valueid: param.valueid || null
        }));

        const { error: paramsError } = await (supabase as any)
          .from('store_product_params')
          .insert(paramsData);

        if (paramsError) {
          console.error('Update product params error:', paramsError);
        }
      }
    }

    // Обновляем изображения товара, если они переданы
    if (productData.images !== undefined) {
      // Удаляем старые изображения
      await (supabase as any)
        .from('store_product_images')
        .delete()
        .eq('product_id', id);

      // Добавляем новые изображения
      if (productData.images.length > 0) {
        // Нормализуем флаг главного изображения: должно быть ровно одно is_main=true
        const hasExplicitMain = productData.images.some(img => img.is_main === true);
        let mainAssigned = false;

        const imagesData = productData.images.map((image, index) => {
          let isMain: boolean;
          if (hasExplicitMain) {
            if (image.is_main === true && !mainAssigned) {
              isMain = true;
              mainAssigned = true;
            } else {
              isMain = false;
            }
          } else {
            isMain = index === 0;
          }

          return {
            product_id: id,
            url: image.url,
            order_index: image.order_index || index,
            is_main: isMain
          };
        });

        const { error: imagesError } = await (supabase as any)
          .from('store_product_images')
          .insert(imagesData);

        if (imagesError) {
          console.error('Update product images error:', imagesError);
        }
      }
    }

    return product;
  }

  /** Удаление товара */
  static async deleteProduct(id: string): Promise<void> {
    const sessionValidation = await SessionValidator.ensureValidSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    }

    // 1) Удаляем связанные изображения из R2 (r2-delete)
    try {
      const { data: images, error: imagesFetchError } = await (supabase as any)
        .from('store_product_images')
        .select('*')
        .eq('product_id', id)
        .order('order_index', { ascending: true });

      if (!imagesFetchError && Array.isArray(images) && images.length) {
        const keys = images
          .map((img: any) => img?.object_key || (typeof img?.url === 'string' ? R2Storage.extractObjectKeyFromUrl(img.url) : null))
          .filter(Boolean) as string[];

        if (keys.length) {
          await Promise.all(
            keys.map(async (key) => {
              try {
                await R2Storage.deleteFile(key);
                // Очистка возможных временных загрузок
                await R2Storage.removePendingUpload(key);
              } catch (e) {
                // Не блокируем удаление товара, но фиксируем проблему удаления файла
                console.warn('R2 delete error for key:', key, e);
              }
            })
          );
        }
      }
    } catch (e) {
      // Безопасно игнорируем ошибки на этапе удаления из R2, чтобы не блокировать удаление товара
      console.warn('Failed to delete product images from R2:', e);
    }

    // 2) Удаляем связанные данные в БД
    await Promise.all([
      (supabase as any).from('store_product_params').delete().eq('product_id', id),
      (supabase as any).from('store_product_images').delete().eq('product_id', id)
    ]);

    // 3) Удаляем товар
    const { error } = await (supabase as any)
      .from('store_products')
      .delete()
      .eq('id', id)
      // RLS should ensure only the owner can delete
      ;

    if (error) {
      console.error('Delete product error:', error);
      throw new Error(error.message);
    }
  }
}
