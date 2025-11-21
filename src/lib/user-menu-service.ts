import { supabase } from "@/integrations/supabase/client";
import { UserAuthService } from "./user-auth-service";
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
   * Auto-assign icon based on menu item properties
   * Used as fallback when no explicit icon is set
   */
  static getAutoIconForMenuItem(item: { title: string; path: string }): string {
    const title = item.title.toLowerCase();
    const path = item.path.toLowerCase();
    
    // Supplier-related icons
    if (title.includes('supplier') || title.includes('постачальник')) {
      return 'Truck';
    }
    
    if (path.includes('supplier') || path.includes('постачальник')) {
      return 'Truck';
    }
    
    // Shop-related icons
    if (title.includes('shop') || title.includes('магазин')) {
      return 'Store';
    }
    
    if (path.includes('shop') || path.includes('магазин')) {
      return 'Store';
    }
    
    // Payment-related icons
    if (title.includes('payment') || title.includes('платеж')) {
      return 'CreditCard';
    }
    
    if (path.includes('payment') || path.includes('платеж')) {
      return 'CreditCard';
    }
    
    // Return existing icon or default to circle if none
    return 'circle';
  }
  
  /**
   * Get all menu items for a user
   */
  static async getUserMenuItems(userId: string, activeOnly: boolean = true): Promise<UserMenuItem[]> {
    try {
      const authMe = await UserAuthService.fetchAuthMe();
      let items = Array.isArray(authMe.menuItems) ? authMe.menuItems : [];
      if (activeOnly) items = items.filter(i => i.is_active === true);
      if (items.length > 0) {
        return items.map((item: UserMenuItem) => {
          if ((!item.icon_name || item.icon_name === 'circle' || item.icon_name === 'Circle') &&
              (item.title.toLowerCase().includes('supplier') || 
               item.title.toLowerCase().includes('постачальник') ||
               item.title.toLowerCase().includes('shop') || 
               item.title.toLowerCase().includes('магазин') ||
               item.title.toLowerCase().includes('payment') || 
               item.title.toLowerCase().includes('платеж') ||
               item.path.toLowerCase().includes('supplier') || 
               item.path.toLowerCase().includes('постачальник') ||
               item.path.toLowerCase().includes('shop') || 
               item.path.toLowerCase().includes('магазин') ||
               item.path.toLowerCase().includes('payment') || 
               item.path.toLowerCase().includes('платеж'))) {
            return { ...item, icon_name: this.getAutoIconForMenuItem({ title: item.title, path: item.path }) };
          }
          return item;
        });
      }

      let query = (supabase as any)
        .from('user_menu_items')
        .select('*');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query.order('order_index', { ascending: true });
      if (error) throw error;
      const rows: UserMenuItem[] = (data || []) as UserMenuItem[];
      return rows.map((item: UserMenuItem) => {
        if ((!item.icon_name || item.icon_name === 'circle' || item.icon_name === 'Circle') &&
            (item.title.toLowerCase().includes('supplier') || 
             item.title.toLowerCase().includes('постачальник') ||
             item.title.toLowerCase().includes('shop') || 
             item.title.toLowerCase().includes('магазин') ||
             item.title.toLowerCase().includes('payment') || 
             item.title.toLowerCase().includes('платеж') ||
             item.path.toLowerCase().includes('supplier') || 
             item.path.toLowerCase().includes('постачальник') ||
             item.path.toLowerCase().includes('shop') || 
             item.path.toLowerCase().includes('магазин') ||
             item.path.toLowerCase().includes('payment') || 
             item.path.toLowerCase().includes('платеж'))) {
          return { ...item, icon_name: this.getAutoIconForMenuItem({ title: item.title, path: item.path }) };
        }
        return item;
      });
    } catch (error) {
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

      // Auto-assign icon only for supplier/shop/payment-related items
      let icon_name = menuData.icon_name;
      if (!icon_name && 
          (menuData.title.toLowerCase().includes('supplier') || 
           menuData.title.toLowerCase().includes('постачальник') ||
           menuData.title.toLowerCase().includes('shop') || 
           menuData.title.toLowerCase().includes('магазин') ||
           menuData.title.toLowerCase().includes('payment') || 
           menuData.title.toLowerCase().includes('платеж') ||
           menuData.path.toLowerCase().includes('supplier') || 
           menuData.path.toLowerCase().includes('постачальник') ||
           menuData.path.toLowerCase().includes('shop') || 
           menuData.path.toLowerCase().includes('магазин') ||
           menuData.path.toLowerCase().includes('payment') || 
           menuData.path.toLowerCase().includes('платеж'))) {
        icon_name = this.getAutoIconForMenuItem({ title: menuData.title, path: menuData.path });
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
          icon_name: icon_name || 'FileText', // Default to FileText instead of circle
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

      // Auto-assign icon only for supplier/shop/payment-related items
      let icon_name = menuData.icon_name;
      if (menuData.title && !icon_name && 
          (menuData.title.toLowerCase().includes('supplier') || 
           menuData.title.toLowerCase().includes('постачальник') ||
           menuData.title.toLowerCase().includes('shop') || 
           menuData.title.toLowerCase().includes('магазин') ||
           menuData.title.toLowerCase().includes('payment') || 
           menuData.title.toLowerCase().includes('платеж'))) {
        // We need to get the path to determine the icon
        const { data: existingItem } = await (supabase as any)
          .from('user_menu_items')
          .select('path')
          .eq('id', itemId)
          .maybeSingle();
        
        if (existingItem) {
          icon_name = this.getAutoIconForMenuItem({ 
            title: menuData.title, 
            path: menuData.path || existingItem.path 
          });
        }
      }

      const updateData = {
        ...menuData,
        ...(icon_name !== undefined && { icon_name }) // Only include icon_name if it's defined
      };

      const { data, error } = await (supabase as any)
        .from('user_menu_items')
        .update(updateData)
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

      // Only apply auto-icon assignment for supplier/shop/payment-related items
      if (data && (!data.icon_name || data.icon_name === 'circle' || data.icon_name === 'Circle') &&
          (data.title.toLowerCase().includes('supplier') || 
           data.title.toLowerCase().includes('постачальник') ||
           data.title.toLowerCase().includes('shop') || 
           data.title.toLowerCase().includes('магазин') ||
           data.title.toLowerCase().includes('payment') || 
           data.title.toLowerCase().includes('платеж') ||
           data.path.toLowerCase().includes('supplier') || 
           data.path.toLowerCase().includes('постачальник') ||
           data.path.toLowerCase().includes('shop') || 
           data.path.toLowerCase().includes('магазин') ||
           data.path.toLowerCase().includes('payment') || 
           data.path.toLowerCase().includes('платеж'))) {
        return {
          ...data,
          icon_name: this.getAutoIconForMenuItem({ title: data.title, path: data.path })
        };
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
      
      // First try exact match
      let { data, error } = await (supabase as any)
        .from('user_menu_items')
        .select('*')
        .eq('path', normalizedPath)
        .eq('is_active', true)
        .maybeSingle();

      // If not found, try to find a parent menu item for hierarchical paths
      if (error || !data) {
        const pathParts = normalizedPath.split('/').filter(part => part.length > 0);
        if (pathParts.length > 1) {
          // Try parent paths
          for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('/');
            const { data: parentData, error: parentError } = await (supabase as any)
              .from('user_menu_items')
              .select('*')
              .eq('path', parentPath)
              .eq('is_active', true)
              .maybeSingle();
            
            if (!parentError && parentData) {
              // Found a parent, return it with modified path
              const result = {
                ...parentData,
                path: normalizedPath
              } as UserMenuItem;
              
              // Only apply auto-icon assignment for supplier/shop/payment-related items
              if ((!result.icon_name || result.icon_name === 'circle' || result.icon_name === 'Circle') &&
                  (result.title.toLowerCase().includes('supplier') || 
                   result.title.toLowerCase().includes('постачальник') ||
                   result.title.toLowerCase().includes('shop') || 
                   result.title.toLowerCase().includes('магазин') ||
                   result.title.toLowerCase().includes('payment') || 
                   result.title.toLowerCase().includes('платеж') ||
                   result.path.toLowerCase().includes('supplier') || 
                   result.path.toLowerCase().includes('постачальник') ||
                   result.path.toLowerCase().includes('shop') || 
                   result.path.toLowerCase().includes('магазин') ||
                   result.path.toLowerCase().includes('payment') || 
                   result.path.toLowerCase().includes('платеж'))) {
                result.icon_name = this.getAutoIconForMenuItem({ title: result.title, path: result.path });
              }
              
              return result;
            }
          }
        }
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching menu item by path:', error);
          throw error;
        }
        return null; // Not found
      }

      // Only apply auto-icon assignment for supplier/shop/payment-related items
      if (data && (!data.icon_name || data.icon_name === 'circle' || data.icon_name === 'Circle') &&
          (data.title.toLowerCase().includes('supplier') || 
           data.title.toLowerCase().includes('постачальник') ||
           data.title.toLowerCase().includes('shop') || 
           data.title.toLowerCase().includes('магазин') ||
           data.title.toLowerCase().includes('payment') || 
           data.title.toLowerCase().includes('платеж') ||
           data.path.toLowerCase().includes('supplier') || 
           data.path.toLowerCase().includes('постачальник') ||
           data.path.toLowerCase().includes('shop') || 
           data.path.toLowerCase().includes('магазин') ||
           data.path.toLowerCase().includes('payment') || 
           data.path.toLowerCase().includes('платеж'))) {
        return {
          ...data,
          icon_name: this.getAutoIconForMenuItem({ title: data.title, path: data.path })
        };
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

      // Only apply auto-icon assignment for items that don't have an icon or have the default circle icon
      // AND are supplier/shop/payment-related
      const itemsWithIcons = (data || []).map((item: UserMenuItem) => {
        if ((!item.icon_name || item.icon_name === 'circle' || item.icon_name === 'Circle') &&
            (item.title.toLowerCase().includes('supplier') || 
             item.title.toLowerCase().includes('постачальник') ||
             item.title.toLowerCase().includes('shop') || 
             item.title.toLowerCase().includes('магазин') ||
             item.title.toLowerCase().includes('payment') || 
             item.title.toLowerCase().includes('платеж') ||
             item.path.toLowerCase().includes('supplier') || 
             item.path.toLowerCase().includes('постачальник') ||
             item.path.toLowerCase().includes('shop') || 
             item.path.toLowerCase().includes('магазин') ||
             item.path.toLowerCase().includes('payment') || 
             item.path.toLowerCase().includes('платеж'))) {
          return {
            ...item,
            icon_name: this.getAutoIconForMenuItem({ title: item.title, path: item.path })
          };
        }
        return item;
      });

      return itemsWithIcons;
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
