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

      return data || [];
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

    return data;
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

    // Создаем изображения товара, если они есть
    if (productData.images && productData.images.length > 0) {
      const imagesData = productData.images.map((image, index) => ({
        product_id: product.id,
        url: image.url,
        order_index: image.order_index || index
      }));

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
        const imagesData = productData.images.map((image, index) => ({
          product_id: id,
          url: image.url,
          order_index: image.order_index || index
        }));

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
