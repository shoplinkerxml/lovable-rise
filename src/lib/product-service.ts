import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "./session-validation";

export interface Product {
  id: string;
  user_id: string;
  product_name: string;
  description?: string | null;
  price?: number | null;
  sku?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  product_name: string;
  description?: string | null;
  price?: number | null;
  sku?: string | null;
}

export interface UpdateProductData {
  product_name?: string;
  description?: string | null;
  price?: number | null;
  sku?: string | null;
  is_active?: boolean;
}

export interface ProductLimitInfo {
  current: number;
  max: number;
  canCreate: boolean;
}

export class ProductService {
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

    // Get user's current active subscription
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('tariff_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1);

    if (subscriptionError || !subscriptions?.[0]) {
      return 0;
    }

    const subscription = subscriptions[0];

    // Get the product limit directly from tariff_limits by limit_name
    const { data: limitData, error: limitError } = await supabase
      .from('tariff_limits')
      .select('value')
      .eq('tariff_id', subscription.tariff_id)
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
    // Пока таблицы user_products нет, возвращаем 0 как текущее количество
    const currentCount = 0;

    return {
      current: currentCount,
      max: maxProducts,
      canCreate: currentCount < maxProducts
    };
  }

  /** Получение количества продуктов текущего пользователя - временно возвращает 0 */
  static async getProductsCount(): Promise<number> {
    // TODO: Когда таблица user_products будет создана, раскомментировать:
    // const sessionValidation = await SessionValidator.ensureValidSession();
    // if (!sessionValidation.isValid) {
    //   throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    // }

    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) {
    //   throw new Error("User not authenticated");
    // }

    // const { count, error } = await (supabase as any)
    //   .from('user_products')
    //   .select('*', { count: 'exact', head: true })
    //   .eq('user_id', user.id);

    // if (error) {
    //   console.error('Get products count error:', error);
    //   return 0;
    // }

    // return count || 0;
    return 0;
  }

  /** Получение списка продуктов текущего пользователя - временно возвращает пустой массив */
  static async getProducts(): Promise<Product[]> {
    // TODO: Когда таблица user_products будет создана, раскомментировать:
    // const sessionValidation = await SessionValidator.ensureValidSession();
    // if (!sessionValidation.isValid) {
    //   throw new Error("Invalid session: " + (sessionValidation.error || "Session expired"));
    // }

    // const { data, error } = await (supabase as any)
    //   .from('user_products')
    //   .select('*')
    //   .order('created_at', { ascending: false });

    // if (error) {
    //   console.error('Get products error:', error);
    //   throw new Error(error.message);
    // }

    // return data || [];
    return [];
  }

  /** Получение одного продукта по ID - временно недоступно */
  static async getProduct(id: string): Promise<Product> {
    throw new Error("Функціонал тимчасово недоступний. Таблиця user_products ще не створена.");
  }

  /** Создание нового продукта - временно недоступно */
  static async createProduct(productData: CreateProductData): Promise<Product> {
    throw new Error("Функціонал тимчасово недоступний. Таблиця user_products ще не створена.");
  }

  /** Обновление продукта - временно недоступно */
  static async updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
    throw new Error("Функціонал тимчасово недоступний. Таблиця user_products ще не створена.");
  }

  /** Удаление продукта - временно недоступно */
  static async deleteProduct(id: string): Promise<void> {
    throw new Error("Функціонал тимчасово недоступний. Таблиця user_products ще не створена.");
  }
}
