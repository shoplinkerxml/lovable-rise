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
      console.log('getUserMenuItems called with:', { userId, activeOnly }); // Debug log
      // Get menu items - user menu items are shared across all users
      let query = (supabase as any)
        .from('user_menu_items')
        .select('*');

      if (activeOnly) {
        query = query.eq('is_active', true);
        console.log('Filtering for active items only'); // Debug log
      }

      // Apply ordering before executing the query
      const { data, error } = await query.order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching user menu items:', error);
        throw error;
      }

      console.log('Fetched user menu items:', data); // Debug log
      console.log('Active only:', activeOnly); // Debug log
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
      console.log('getMenuHierarchy called with userId:', userId); // Debug log
      // Get all active menu items for the user
      const allItems = await this.getUserMenuItems(userId, true);
      console.log('All items for hierarchy:', allItems); // Debug log
      
      // Build a map of all items by ID for quick lookup
      const itemMap = new Map<number, UserMenuItem & { children?: UserMenuItem[] }>();
      allItems.forEach(item => {
        itemMap.set(item.id, { ...item, children: [] });
      });
      
      // Build hierarchy by assigning children to their parents
      const rootItems: (UserMenuItem & { children?: UserMenuItem[] })[] = [];
      
      allItems.forEach(item => {
        if (item.parent_id) {
          // This is a child item, add it to its parent's children array
          const parent = itemMap.get(item.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(item);
          }
        } else {
          // This is a root item
          const itemWithChildren = itemMap.get(item.id);
          if (itemWithChildren) {
            rootItems.push(itemWithChildren);
          }
        }
      });
      
      // Sort children by order_index
      rootItems.forEach(item => {
        if (item.children) {
          item.children.sort((a, b) => a.order_index - b.order_index);
        }
      });
      
      // Sort root items by order_index
      rootItems.sort((a, b) => a.order_index - b.order_index);
      
      console.log('Built hierarchy:', rootItems); // Debug log
      return rootItems;
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
          .eq('parent_id', menuData.parent_id || null)
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle();

        orderIndex = (maxOrderItem?.order_index || 0) + 1;
      }

      // Set default content based on page type with better defaults
      const defaultContent = menuData.content_data || {};
      if (!defaultContent.content) {
        switch (menuData.page_type) {
          case 'content':
            defaultContent.content = `<div class="prose max-w-none">
              <h2>Welcome to ${menuData.title}</h2>
              <p>This is a placeholder content page. You can edit this page to add your own content.</p>
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
                <h3 class="font-semibold text-emerald-800">Getting Started</h3>
                <p class="text-emerald-700">Click the "Edit" button in the top right corner to customize this page.</p>
              </div>
            </div>`;
            break;
          case 'dashboard':
            defaultContent.widgets = [{
              type: 'stats',
              title: 'Overview',
              data: {}
            }, {
              type: 'chart',
              title: 'Analytics',
              data: {}
            }];
            break;
          case 'form':
            defaultContent.form_config = {
              fields: [],
              submitAction: 'save'
            };
            break;
          case 'list':
            defaultContent.table_config = {
              columns: [],
              dataSource: 'api'
            };
            break;
          default:
            defaultContent.content = `<div class="prose max-w-none">
              <h2>${menuData.title}</h2>
              <p>Configure your custom page content through the menu management interface.</p>
              <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
                <h3 class="font-semibold text-emerald-800">Custom Page</h3>
                <p class="text-emerald-700">This is a custom page type. You can add your own components here.</p>
              </div>
            </div>`;
        }
      }

      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .insert({
          user_id: userId, // Still store user_id for RLS policy compatibility
          ...menuData,
          order_index: orderIndex,
          page_type: menuData.page_type || 'content',
          content_data: defaultContent
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
          .eq('path', menuData.path)
          .neq('id', itemId)
          .maybeSingle();

        if (existingItem) {
          throw new Error('Path already exists');
        }
      }

      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .update(menuData)
        .eq('id', itemId)
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
        .eq('id', itemId);

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
   * Get a single menu item by path
   */
  static async getMenuItemByPath(path: string, userId: string): Promise<UserMenuItem | null> {
    try {
      // Remove leading slash if present to match database format
      const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
      
      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .select('*')
        .eq('path', normalizedPath)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Error fetching menu item by path:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getMenuItemByPath:', error);
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