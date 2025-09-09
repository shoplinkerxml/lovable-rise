import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdmin, MenuItemData } from "@/providers/admin-provider";
import { MenuSkeleton } from "@/components/LoadingSkeletons";

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
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed = false }) => {
  const { 
    menuItems, 
    activeMenuItem, 
    menuLoading, 
    navigateToMenuItem, 
    preloadContent 
  } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();

  const tree = useMemo(() => buildTree(menuItems), [menuItems]);

  // Handle menu item click
  const handleMenuClick = (item: MenuItemData) => {
    navigateToMenuItem(item);
  };

  // Handle menu item hover for preloading
  const handleMenuHover = (item: MenuItemData) => {
    preloadContent(item);
  };

  // Check if item is active
  const isActiveItem = (item: MenuItemData) => {
    return activeMenuItem?.id === item.id || location.pathname === `/admin${item.path}`;
  };



  return (
    <aside className={`hidden md:flex ${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 shrink-0 border-r bg-background p-4 flex-col gap-3`}> 
      <div className={`text-xl font-semibold ${collapsed ? 'text-center text-sm' : ''}`}>
        {collapsed ? 'MG' : 'MarketGrow'}
      </div>
      
      <nav className="space-y-1 flex-1">
        {menuLoading ? (
          <MenuSkeleton />
        ) : (
          tree.root?.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => handleMenuClick(item)}
                onMouseEnter={() => handleMenuHover(item)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  isActiveItem(item) ? "bg-secondary" : "hover:bg-accent"
                }`}
                title={collapsed ? item.title : undefined}
              >
                {collapsed ? item.title.charAt(0).toUpperCase() : item.title}
              </button>
              
              {!collapsed && tree[item.id]?.length && (
                <div className="ml-3 mt-1 space-y-1">
                  {tree[item.id].map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleMenuClick(child)}
                      onMouseEnter={() => handleMenuHover(child)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActiveItem(child) ? "bg-secondary" : "hover:bg-accent"
                      }`}
                    >
                      {child.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </nav>
      
      <Button 
        variant="secondary" 
        className="mt-auto" 
        onClick={() => navigate("/admin/dashboard")}
        size={collapsed ? "icon" : "default"}
        title={collapsed ? "Dashboard" : undefined}
      >
        {collapsed ? "D" : "Dashboard"}
      </Button>
    </aside>
  );
};

export default AdminSidebar;


