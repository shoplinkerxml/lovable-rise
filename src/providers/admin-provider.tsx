import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface MenuItemData {
  id: number;
  title: string;
  path: string;
  page_type: 'content' | 'form' | 'dashboard' | 'list' | 'custom';
  content_data?: any;
  template_name?: string;
  meta_data?: any;
  parent_id?: number | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminContextState {
  // Menu state
  menuItems: MenuItemData[];
  activeMenuItem: MenuItemData | null;
  menuLoading: boolean;
  
  // Content state
  contentLoading: boolean;
  contentError: string | null;
  
  // Cache for content data
  contentCache: Record<string, any>;
  
  // Actions
  setActiveMenuItem: (item: MenuItemData | null) => void;
  navigateToMenuItem: (item: MenuItemData) => void;
  preloadContent: (item: MenuItemData) => Promise<void>;
  clearContentError: () => void;
  refreshMenuItems: () => Promise<void>;
}

const AdminContext = createContext<AdminContextState | null>(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: React.ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [activeMenuItem, setActiveMenuItemState] = useState<MenuItemData | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentCache, setContentCache] = useState<Record<string, any>>({});
  
  const navigate = useNavigate();
  const location = useLocation();

  // Build menu tree structure
  const buildMenuTree = useCallback((items: MenuItemData[]) => {
    const map: Record<number | "root", MenuItemData[]> = { root: [] };
    
    for (const item of items) {
      const key = (item.parent_id ?? "root") as number | "root";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    
    // Sort by order_index
    for (const key in map) {
      map[key as any].sort((a, b) => a.order_index - b.order_index);
    }
    
    return map;
  }, []);

  // Load menu items on mount
  const loadMenuItems = useCallback(async () => {
    setMenuLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Failed to load menu items:', error);
        return;
      }

      setMenuItems(data || []);
    } catch (error) {
      console.error('Error loading menu items:', error);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  // Refresh menu items
  const refreshMenuItems = useCallback(async () => {
    await loadMenuItems();
  }, [loadMenuItems]);

  // Find active menu item based on current path
  const findActiveMenuItem = useCallback((currentPath: string, items: MenuItemData[]) => {
    const adminPath = currentPath.replace('/admin', '');
    return items.find(item => item.path === adminPath) || null;
  }, []);

  // Set active menu item
  const setActiveMenuItem = useCallback((item: MenuItemData | null) => {
    setActiveMenuItemState(item);
    setContentError(null);
  }, []);

  // Navigate to menu item
  const navigateToMenuItem = useCallback((item: MenuItemData) => {
    setContentLoading(true);
    setContentError(null);
    setActiveMenuItem(item);
    navigate(`/admin${item.path}`, { replace: false });
  }, [navigate, setActiveMenuItem]);

  // Preload content for a menu item
  const preloadContent = useCallback(async (item: MenuItemData) => {
    const cacheKey = `content_${item.id}`;
    
    // Don't preload if already cached
    if (contentCache[cacheKey]) {
      return;
    }

    try {
      // For pages that have dynamic content, fetch it
      if (item.page_type === 'content' || item.content_data) {
        // Check if we need to fetch additional content from menu_content table
        const { data: contentData, error } = await supabase
          .from('menu_content')
          .select('*')
          .eq('menu_item_id', item.id)
          .maybeSingle();

        if (!error && contentData) {
          setContentCache(prev => ({
            ...prev,
            [cacheKey]: contentData
          }));
        }
      }
    } catch (error) {
      console.error('Error preloading content for item:', item.title, error);
    }
  }, [contentCache]);

  // Clear content error
  const clearContentError = useCallback(() => {
    setContentError(null);
  }, []);

  // Initialize menu items on mount
  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // Update active menu item when location changes
  useEffect(() => {
    if (menuItems.length > 0) {
      const activeItem = findActiveMenuItem(location.pathname, menuItems);
      if (activeItem && activeItem.id !== activeMenuItem?.id) {
        setActiveMenuItem(activeItem);
      }
    }
  }, [location.pathname, menuItems, activeMenuItem?.id, findActiveMenuItem, setActiveMenuItem]);

  // Set content loading to false when not navigating
  useEffect(() => {
    if (activeMenuItem) {
      setContentLoading(false);
    }
  }, [activeMenuItem]);

  const contextValue: AdminContextState = {
    menuItems,
    activeMenuItem,
    menuLoading,
    contentLoading,
    contentError,
    contentCache,
    setActiveMenuItem,
    navigateToMenuItem,
    preloadContent,
    clearContentError,
    refreshMenuItems,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};