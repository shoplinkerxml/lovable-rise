import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  LayoutDashboard, 
  User, 
  Menu as MenuIcon,
  Edit3,
  Trash2,
  Copy
} from "lucide-react";
import { UserMenuItem } from "@/lib/user-menu-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserSidebarProps {
  menuItems: UserMenuItem[];
  collapsed: boolean;
  onToggle: () => void;
  onMenuUpdate: () => void;
  user: UserProfile;
}

export const UserSidebar = ({ 
  menuItems, 
  collapsed, 
  onToggle, 
  onMenuUpdate,
  user 
}: UserSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  const defaultMenuItems = [
    {
      title: "Dashboard",
      path: "/user/dashboard",
      icon: "LayoutDashboard",
      isDefault: true
    },
    {
      title: "Profile",
      path: "/user/profile",
      icon: "User",
      isDefault: true
    }
  ];

  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  const handleMenuAction = (action: string, item: UserMenuItem) => {
    // These will be implemented when we add menu management UI
    console.log(`${action} menu item:`, item);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const renderMenuItem = (item: UserMenuItem | typeof defaultMenuItems[0], level = 0) => {
    const isDefaultItem = 'isDefault' in item;
    const itemPath = item.path;
    const active = isActive(itemPath);
    
    return (
      <div 
        key={isDefaultItem ? item.path : (item as UserMenuItem).id}
        className={cn(
          "group relative",
          level > 0 && "ml-4"
        )}
        onMouseEnter={() => !isDefaultItem && setHoveredItem((item as UserMenuItem).id)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
            active
              ? "bg-emerald-100 text-emerald-900"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <div 
            className="flex items-center gap-3 flex-1"
            onClick={() => handleMenuClick(itemPath)}
          >
            <DynamicIcon 
              name={isDefaultItem ? item.icon : (item as UserMenuItem).icon_name || "FileText"} 
              className="h-4 w-4" 
            />
            {!collapsed && (
              <span className="truncate">{item.title}</span>
            )}
          </div>
          
          {!collapsed && !isDefaultItem && hoveredItem === (item as UserMenuItem).id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MenuIcon className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleMenuAction('edit', item as UserMenuItem)}>
                  <Edit3 className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuAction('duplicate', item as UserMenuItem)}>
                  <Copy className="h-3 w-3 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleMenuAction('delete', item as UserMenuItem)}
                  className="text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* Render children if any */}
        {'children' in item && item.children && item.children.map(child => 
          renderMenuItem(child, level + 1)
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">MG</span>
            </div>
            <span className="font-semibold">MarketGrow</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      {/* User Info */}
      {!collapsed && (
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {/* Default Menu Items */}
          {!collapsed && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                Main
              </p>
            </div>
          )}
          
          {defaultMenuItems.map(item => renderMenuItem(item))}

          {/* User Custom Menu Items */}
          {menuItems.length > 0 && (
            <>
              {!collapsed && (
                <div className="mt-6 mb-4">
                  <div className="flex items-center justify-between px-3 mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      My Menu
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {menuItems.length}
                    </Badge>
                  </div>
                </div>
              )}
              
              {menuItems.map(item => renderMenuItem(item))}
            </>
          )}

          {/* Add Menu Item Button */}
          {!collapsed && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate('/user/menu-management')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Settings */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start",
            collapsed && "justify-center"
          )}
          onClick={() => navigate('/user/settings')}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Settings</span>}
        </Button>
      </div>
    </div>
  );
};