/**
 * Shared Database Interface for Supabase Edge Functions
 * 
 * This file provides a consistent Database interface that should be used
 * across all Edge Functions to ensure type safety and consistency.
 * 
 * Key features:
 * - Complete role definitions including 'admin', 'manager', and 'user'
 * - Consistent table schemas
 * - Proper TypeScript type definitions
 */

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          role: 'admin' | 'manager' | 'user'  // All three roles explicitly defined
          status: 'active' | 'inactive'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          phone?: string | null
          role?: 'admin' | 'manager' | 'user'  // All three roles explicitly defined
          status?: 'active' | 'inactive'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          name?: string
          phone?: string | null
          role?: 'admin' | 'manager' | 'user'  // All three roles explicitly defined
          status?: 'active' | 'inactive'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: number
          title: string
          path: string
          parent_id: number | null
          order_index: number
          is_active: boolean
          page_type: 'content' | 'form' | 'dashboard' | 'list' | 'custom'
          content_data: any
          template_name: string | null
          meta_data: any
          icon_name: string | null
          section_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          path: string
          parent_id?: number | null
          order_index?: number
          is_active?: boolean
          page_type?: 'content' | 'form' | 'dashboard' | 'list' | 'custom'
          content_data?: any
          template_name?: string | null
          meta_data?: any
          icon_name?: string | null
          section_id?: number | null
        }
        Update: {
          title?: string
          path?: string
          parent_id?: number | null
          order_index?: number
          is_active?: boolean
          page_type?: 'content' | 'form' | 'dashboard' | 'list' | 'custom'
          content_data?: any
          template_name?: string | null
          meta_data?: any
          icon_name?: string | null
          section_id?: number | null
        }
      }
      menu_sections: {
        Row: {
          id: number
          title: string
          order_index: number
          is_active: boolean
          icon_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          order_index?: number
          is_active?: boolean
          icon_name?: string | null
        }
        Update: {
          title?: string
          order_index?: number
          is_active?: boolean
          icon_name?: string | null
        }
      }
      user_permissions: {
        Row: {
          id: number
          user_id: string
          menu_item_id: number
          can_view: boolean
          can_edit: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          menu_item_id: number
          can_view?: boolean
          can_edit?: boolean
        }
        Update: {
          can_view?: boolean
          can_edit?: boolean
        }
      }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'user'
      user_status: 'active' | 'inactive'
      page_type: 'content' | 'form' | 'dashboard' | 'list' | 'custom'
    }
  }
}

/**
 * Type aliases for common role checking
 */
export type UserRole = Database['public']['Enums']['user_role']
export type UserStatus = Database['public']['Enums']['user_status']
export type PageType = Database['public']['Enums']['page_type']

/**  
 * Helper type for profile queries
 */
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

/**
 * Helper type for menu item queries  
 */
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert']
export type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update']

/**
 * Helper type for menu section queries
 */
export type MenuSection = Database['public']['Tables']['menu_sections']['Row']
export type MenuSectionInsert = Database['public']['Tables']['menu_sections']['Insert']
export type MenuSectionUpdate = Database['public']['Tables']['menu_sections']['Update']

/**
 * Helper type for user permission queries
 */
export type UserPermission = Database['public']['Tables']['user_permissions']['Row']
export type UserPermissionInsert = Database['public']['Tables']['user_permissions']['Insert']
export type UserPermissionUpdate = Database['public']['Tables']['user_permissions']['Update']