import { supabase } from "@/integrations/supabase/client";

export interface UserMenuItem {
  id: number;
  user_id: string;
  title: string;
  path: string;
  parent_id?: number;
  order_index: number;
  is_active: boolean;
  page_type: 'content' | 'form' | 'dashboard' | 'list' | 'custom';
  content_data?: Record<string, any>;
  template_name?: string;
  meta_data?: Record<string, any>;
  icon_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserMenuItem {
  title: string;
  path: string;
  parent_id?: number;
  order_index?: number;
  page_type?: 'content' | 'form' | 'dashboard' | 'list' | 'custom';
  content_data?: Record<string, any>;
  template_name?: string;
  meta_data?: Record<string, any>;
  icon_name?: string;
  description?: string;
}

export interface UpdateUserMenuItem {
  title?: string;
  path?: string;
  parent_id?: number;
  order_index?: number;
  is_active?: boolean;
  page_type?: 'content' | 'form' | 'dashboard' | 'list' | 'custom';
  content_data?: Record<string, any>;
  template_name?: string;
  meta_data?: Record<string, any>;
  icon_name?: string;
  description?: string;
}

export interface MenuReorderItem {
  id: number;
  order_index: number;
  parent_id?: number;
}

export class UserMenuService {
  /**
   * Get all menu items for a user
   */
  static async getUserMenuItems(userId: string, activeOnly: boolean = true): Promise<UserMenuItem[]> {
    try {
      let query = (supabase as any)
        .from('user_menu_items')
        .select('*')
        .eq('user_id', userId);

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('order_index');

      if (error) {
        console.error('Error fetching user menu items:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserMenuItems:', error);
      throw error;
    }
  }

  /**
   * Get menu items organized in hierarchical structure
   */
  static async getMenuHierarchy(userId: string): Promise<UserMenuItem[]> {
    try {
      const allItems = await this.getUserMenuItems(userId, true);
      
      // Separate root items and children
      const rootItems = allItems.filter(item => !item.parent_id);
      const childItems = allItems.filter(item => item.parent_id);
      
      // Build hierarchy
      const buildHierarchy = (items: UserMenuItem[]): UserMenuItem[] => {
        return items.map(item => {
          const children = childItems.filter(child => child.parent_id === item.id);
          return {
            ...item,
            children: children.length > 0 ? children : undefined
          } as UserMenuItem & { children?: UserMenuItem[] };
        });
      };
      
      return buildHierarchy(rootItems);
    } catch (error) {
      console.error('Error in getMenuHierarchy:', error);
      throw error;
    }
  }

  /**
   * Create a new menu item
   */
  static async createMenuItem(userId: string, menuData: CreateUserMenuItem): Promise<UserMenuItem> {
    try {
      // Validate path uniqueness for the user
      const { data: existingItem } = await (supabase as any)
        .from('user_menu_items')
        .select('id')
        .eq('user_id', userId)
        .eq('path', menuData.path)
        .maybeSingle();

      if (existingItem) {
        throw new Error('Path already exists for this user');
      }

      // Get the next order index if not provided
      let orderIndex = menuData.order_index;
      if (orderIndex === undefined) {
        const { data: maxOrderItem } = await (supabase as any)
          .from('user_menu_items')
          .select('order_index')
          .eq('user_id', userId)
          .eq('parent_id', menuData.parent_id || null)
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle();

        orderIndex = (maxOrderItem?.order_index || 0) + 1;
      }

      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .insert({
          user_id: userId,
          ...menuData,
          order_index: orderIndex,
          page_type: menuData.page_type || 'content'
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error creating menu item:', error);
        throw error;
      }

      return data as UserMenuItem;
    } catch (error) {
      console.error('Error in createMenuItem:', error);
      throw error;
    }
  }

  /**
   * Update an existing menu item
   */
  static async updateMenuItem(itemId: number, userId: string, menuData: UpdateUserMenuItem): Promise<UserMenuItem> {
    try {
      // If path is being updated, validate uniqueness
      if (menuData.path) {
        const { data: existingItem } = await (supabase as any)
          .from('user_menu_items')
          .select('id')
          .eq('user_id', userId)
          .eq('path', menuData.path)
          .neq('id', itemId)
          .maybeSingle();

        if (existingItem) {
          throw new Error('Path already exists for this user');
        }
      }

      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .update(menuData)
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating menu item:', error);
        throw error;
      }

      return data as UserMenuItem;
    } catch (error) {
      console.error('Error in updateMenuItem:', error);
      throw error;
    }
  }

  /**
   * Delete a menu item
   */
  static async deleteMenuItem(itemId: number, userId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('user_menu_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting menu item:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteMenuItem:', error);
      throw error;
    }
  }

  /**
   * Soft delete a menu item (set is_active to false)
   */
  static async deactivateMenuItem(itemId: number, userId: string): Promise<UserMenuItem> {
    try {
      return await this.updateMenuItem(itemId, userId, { is_active: false });
    } catch (error) {
      console.error('Error in deactivateMenuItem:', error);
      throw error;
    }
  }

  /**
   * Reorder menu items
   */
  static async reorderMenuItems(userId: string, reorderedItems: MenuReorderItem[]): Promise<void> {
    try {
      // Perform updates in a transaction-like manner
      const updates = reorderedItems.map(item => 
        (supabase as any)
          .from('user_menu_items')
          .update({ 
            order_index: item.order_index,
            parent_id: item.parent_id || null
          })
          .eq('id', item.id)
          .eq('user_id', userId)
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error in reorderMenuItems:', error);
      throw error;
    }
  }

  /**
   * Get a single menu item by ID
   */
  static async getMenuItem(itemId: number, userId: string): Promise<UserMenuItem | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Error fetching menu item:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getMenuItem:', error);
      throw error;
    }
  }

  /**
   * Get menu items by parent ID
   */
  static async getChildMenuItems(userId: string, parentId?: number): Promise<UserMenuItem[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .select('*')
        .eq('user_id', userId)
        .eq('parent_id', parentId || null)
        .eq('is_active', true)
        .order('order_index');

      if (error) {
        console.error('Error fetching child menu items:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getChildMenuItems:', error);
      throw error;
    }
  }

  /**
   * Duplicate a menu item
   */
  static async duplicateMenuItem(itemId: number, userId: string, newTitle?: string): Promise<UserMenuItem> {
    try {
      const originalItem = await this.getMenuItem(itemId, userId);
      if (!originalItem) {
        throw new Error('Menu item not found');
      }

      // Create new item based on original
      const duplicateData: CreateUserMenuItem = {
        title: newTitle || `${originalItem.title} (Copy)`,
        path: `${originalItem.path}-copy-${Date.now()}`,
        parent_id: originalItem.parent_id,
        page_type: originalItem.page_type,
        content_data: originalItem.content_data,
        template_name: originalItem.template_name,
        meta_data: originalItem.meta_data,
        icon_name: originalItem.icon_name,
        description: originalItem.description
      };

      return await this.createMenuItem(userId, duplicateData);
    } catch (error) {
      console.error('Error in duplicateMenuItem:', error);
      throw error;
    }
  }
}