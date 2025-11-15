export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      currencies: {
        Row: {
          code: string
          id: number
          is_base: boolean | null
          name: string
          rate: number
          status: boolean | null
        }
        Insert: {
          code: string
          id?: number
          is_base?: boolean | null
          name: string
          rate: number
          status?: boolean | null
        }
        Update: {
          code?: string
          id?: number
          is_base?: boolean | null
          name?: string
          rate?: number
          status?: boolean | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          order_index: number
          parent_id: number | null
          path: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          order_index?: number
          parent_id?: number | null
          path: string
          title: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          order_index?: number
          parent_id?: number | null
          path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_menu_items_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tariff_features: {
        Row: {
          feature_name: string
          id: number
          is_active: boolean | null
          tariff_id: number
        }
        Insert: {
          feature_name: string
          id?: number
          is_active?: boolean | null
          tariff_id: number
        }
        Update: {
          feature_name?: string
          id?: number
          is_active?: boolean | null
          tariff_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_tariff_features_tariff"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_features_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_limits: {
        Row: {
          id: number
          is_active: boolean | null
          limit_name: string
          tariff_id: number
          template_id: number | null
          value: number
        }
        Insert: {
          id?: number
          is_active?: boolean | null
          limit_name: string
          tariff_id: number
          template_id?: number | null
          value: number
        }
        Update: {
          id?: number
          is_active?: boolean | null
          limit_name?: string
          tariff_id?: number
          template_id?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_tariff_limits_tariff"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_limits_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
        ]
      }
      tariffs: {
        Row: {
          created_at: string | null
          currency_code: string
          currency_id: number | null
          description: string | null
          duration_days: number | null
          id: number
          is_active: boolean | null
          is_free: boolean | null
          is_lifetime: boolean | null
          name: string
          new_price: number | null
          old_price: number | null
          popular: boolean
          sort_order: number
          updated_at: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string | null
          currency_code: string
          currency_id?: number | null
          description?: string | null
          duration_days?: number | null
          id?: number
          is_active?: boolean | null
          is_free?: boolean | null
          is_lifetime?: boolean | null
          name: string
          new_price?: number | null
          old_price?: number | null
          popular?: boolean
          sort_order?: number
          updated_at?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string | null
          currency_code?: string
          currency_id?: number | null
          description?: string | null
          duration_days?: number | null
          id?: number
          is_active?: boolean | null
          is_free?: boolean | null
          is_lifetime?: boolean | null
          name?: string
          new_price?: number | null
          old_price?: number | null
          popular?: boolean
          sort_order?: number
          updated_at?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_tariffs_currency"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_menu_items: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          order_index: number
          parent_id: number | null
          path: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          order_index?: number
          parent_id?: number | null
          path: string
          title: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          order_index?: number
          parent_id?: number | null
          path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_menu_items_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: number
          menu_item_id: number
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: number
          menu_item_id: number
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: number
          menu_item_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          end_date: string | null
          id: number
          is_active: boolean
          start_date: string
          tariff_id: number
          user_id: string
        }
        Insert: {
          end_date?: string | null
          id?: number
          is_active?: boolean
          start_date?: string
          tariff_id: number
          user_id: string
        }
        Update: {
          end_date?: string | null
          id?: number
          is_active?: boolean
          start_date?: string
          tariff_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_tariff_id_fkey"
            columns: ["tariff_id"]
            isOneToOne: false
            referencedRelation: "tariffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suppliers: {
        Row: {
          id: string
          user_id: string
          supplier_name: string
          website_url: string | null
          xml_feed_url: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          supplier_name: string
          website_url?: string | null
          xml_feed_url: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          supplier_name?: string
          website_url?: string | null
          xml_feed_url?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stores: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          store_name: string
          custom_mapping: Json | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          store_name: string
          custom_mapping?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          store_name?: string
          custom_mapping?: Json | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stores_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "store_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          id: string
          user_id: string
          name: string
          name_ua: string | null
          description: string | null
          description_ua: string | null
          vendor: string | null
          article: string | null
          external_id: string
          category_external_id: string | null
          supplier_id: string | null
          store_id: string | null
          currency_code: string
          price: number | null
          price_old: number | null
          price_promo: number | null
          stock_quantity: number
          available: boolean
          state: string
          url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          name_ua?: string | null
          description?: string | null
          description_ua?: string | null
          vendor?: string | null
          article?: string | null
          external_id: string
          category_external_id?: string | null
          supplier_id?: string | null
          store_id?: string | null
          currency_code?: string
          price?: number | null
          price_old?: number | null
          price_promo?: number | null
          stock_quantity?: number
          available?: boolean
          state?: string
          url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          name_ua?: string | null
          description?: string | null
          description_ua?: string | null
          vendor?: string | null
          article?: string | null
          external_id?: string
          category_external_id?: string | null
          supplier_id?: string | null
          store_id?: string | null
          currency_code?: string
          price?: number | null
          price_old?: number | null
          price_promo?: number | null
          stock_quantity?: number
          available?: boolean
          state?: string
          url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "user_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "user_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_product_params: {
        Row: {
          id: string
          product_id: string
          name: string
          value: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          value: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          value?: string
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_params_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "user_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          id: string
          user_id: string
          external_id: string
          name: string
          name_ua: string | null
          parent_id: string | null
          level: number
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          external_id: string
          name: string
          name_ua?: string | null
          parent_id?: string | null
          level?: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          external_id?: string
          name?: string
          name_ua?: string | null
          parent_id?: string | null
          level?: number
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      store_currencies: {
        Row: {
          id: string
          user_id: string
          code: string
          name: string
          symbol: string
          rate: number
          is_base: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          code: string
          name: string
          symbol: string
          rate?: number
          is_base?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          code?: string
          name?: string
          symbol?: string
          rate?: number
          is_base?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_currencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          id: string
          user_id: string
          store_id: string
          external_id: string
          name: string
          name_ua: string | null
          description: string | null
          description_ua: string | null
          vendor: string | null
          article: string | null
          category_id: string | null
          currency_id: string | null
          price: number | null
          price_old: number | null
          price_promo: number | null
          stock_quantity: number
          available: boolean
          state: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          external_id: string
          name: string
          name_ua?: string | null
          description?: string | null
          description_ua?: string | null
          vendor?: string | null
          article?: string | null
          category_id?: string | null
          currency_id?: string | null
          price?: number | null
          price_old?: number | null
          price_promo?: number | null
          stock_quantity?: number
          available?: boolean
          state?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string
          external_id?: string
          name?: string
          name_ua?: string | null
          description?: string | null
          description_ua?: string | null
          vendor?: string | null
          article?: string | null
          category_id?: string | null
          currency_id?: string | null
          price?: number | null
          price_old?: number | null
          price_promo?: number | null
          stock_quantity?: number
          available?: boolean
          state?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "user_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "store_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_products_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "store_currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt_text: string | null
          order_index: number
          is_main: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt_text?: string | null
          order_index?: number
          is_main?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          alt_text?: string | null
          order_index?: number
          is_main?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_params: {
        Row: {
          id: string
          product_id: string
          name: string
          value: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          name: string
          value: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          name?: string
          value?: string
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_params_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_links: {
        Row: {
          id: string
          product_id: string
          url: string
          link_type: string
          title: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          link_type: string
          title?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          link_type?: string
          title?: string | null
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_product_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_structured_menu: {
        Args: { user_uuid: string }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "manager" | "user"
      user_status: "active" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "manager", "user"],
      user_status: ["active", "inactive"],
    },
  },
} as const
