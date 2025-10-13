import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin, MenuItemData } from "@/providers/admin-provider";
import { MenuSkeleton } from "@/components/LoadingSkeletons";
import { MenuSection } from "@/components/ui/menu-section";
import { UserProfileSection } from "@/components/ui/user-profile-section";
import { Logo } from "@/components/ui/logo";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/components/ui/profile-types";
import { useI18n } from "@/providers/i18n-provider";

function buildTree(items: MenuItemData[]): Record<number | "root", MenuItemData[]> {
  const map: Record<number | "root", MenuItemData[]> = { root: [] };
  for (const it of items) {
    const key = (it.parent_id ?? "root") as number | "root";
    if (!map[key]) map[key] = [];
    map[key].push(it);
  }
  for (const key in map) {
    map[key as any].sort((a, b) => a.order_index - b.order_index);
  }
  return map;
}

interface AdminSidebarProps {
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  userProfile?: UserProfile;
  isMobileSheet?: boolean;
  onMobileClose?: () => void;
}

interface SubmenuState {
  [itemId: number]: boolean;
}

interface MenuSectionConfig {
  key: 'main' | 'settings';
  titleKey: string;
  items: MenuItemData[];
  isCollapsible: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed = false, userProfile, isMobileSheet = false, onMobileClose }) => {
  const { 
    menuItems, 
    activeMenuItem, 
    menuLoading, 
    navigateToMenuItem, 
    preloadContent 
  } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const [submenuStates, setSubmenuStates] = useState<SubmenuState>({});

  const tree = useMemo(() => buildTree(menuItems), [menuItems]);

  // Organize menu items into sections
  const menuSections: MenuSectionConfig[] = useMemo(() => [
    {
      key: 'main',
      titleKey: 'menu_main',
      items: menuItems.filter(item => 
        !item.parent_id && 
        (item.section_type === 'main' || !item.section_type)
      ),
      isCollapsible: false
    },
    {
      key: 'settings', 
      titleKey: 'menu_settings',
      items: menuItems.filter(item => 
        !item.parent_id && 
        item.section_type === 'settings'
      ),
      isCollapsible: false
    }
  ], [menuItems]);

  // Handle menu item click
  const handleMenuClick = (item: MenuItemData) => {
    navigateToMenuItem(item);
    // Close mobile menu after navigation
    if (isMobileSheet && onMobileClose) {
      onMobileClose();
    }
  };

  // Handle menu item hover for preloading
  const handleMenuHover = (item: MenuItemData) => {
    preloadContent(item);
  };

  // Toggle submenu state
  const toggleSubmenu = (itemId: number) => {
    setSubmenuStates(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Check if item is active
  const isActiveItem = (item: MenuItemData) => {
    return activeMenuItem?.id === item.id || location.pathname === `/admin${item.path}`;
  };

  const signOut = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.auth.signOut();
      window.location.href = "/admin-auth";
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get user profile from props or set default
  const defaultUserProfile: UserProfile = {
    name: "Administrator",
    email: "admin@marketgrow.com",
    role: "Administrator",
    avatarUrl: ""
  };

  return (
    <aside className={`${isMobileSheet ? 'flex' : 'hidden md:flex'} ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 shrink-0 border-r bg-background p-4 flex-col gap-3`}>
      <Logo collapsed={collapsed} className="mb-8" />
      
      <nav className="space-y-1 flex-1">
        {menuLoading ? (
          <MenuSkeleton />
        ) : (
          <>
            {menuSections.map((section, sectionIndex) => {
              if (!section.items.length) return null;
              
              return (
                <div key={section.key}>
                  {/* Section separator */}
                  {sectionIndex > 0 && (
                    <div className="py-2">
                      <div className="border-t border-gray-200" />
                    </div>
                  )}
                  
                  <MenuSection
                    title={section.key === 'main' ? undefined : (collapsed ? undefined : t(section.titleKey as any))}
                    type={section.key === 'main' ? 'main' : 'settings'}
                    items={section.items}
                    collapsed={collapsed}
                    isCollapsible={section.isCollapsible}
                    children={menuItems.filter(item => section.items.some(parent => parent.id === item.parent_id))}
                    onItemClick={handleMenuClick}
                    onItemHover={handleMenuHover}
                    isActiveItem={isActiveItem}
                    buildTree={buildTree}
                  />
                </div>
              );
            })}
          </>
        )}
      </nav>
      
      <UserProfileSection collapsed={collapsed} onLogout={signOut} userProfile={userProfile || defaultUserProfile} />
    </aside>
  );
};

export default AdminSidebar;


