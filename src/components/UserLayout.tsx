import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { UserSidebar } from "./UserSidebar";
import { UserHeader } from "./UserHeader";
import { UserMenuService, UserMenuItem } from "@/lib/user-menu-service";
import { UserAuthService } from "@/lib/user-auth-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { toast } from "sonner";

const UserLayout = () => {
  const [menuItems, setMenuItems] = useState<UserMenuItem[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { user: currentUser, session, error } = await UserAuthService.getCurrentUser();
      
      if (error || !currentUser || !session) {
        toast.error("Please log in to continue");
        return;
      }

      setUser(currentUser);
      
      // Load user menu items
      await loadUserMenuItems(currentUser.id);
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const loadUserMenuItems = async (userId: string) => {
    try {
      const items = await UserMenuService.getMenuHierarchy(userId);
      setMenuItems(items);
    } catch (error) {
      console.error("Failed to load user menu items:", error);
      toast.error("Failed to load menu items");
    }
  };

  const handleMenuUpdate = () => {
    if (user) {
      loadUserMenuItems(user.id);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <UserSidebar 
        menuItems={menuItems}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMenuUpdate={handleMenuUpdate}
        user={user}
      />
      <div className="flex-1 flex flex-col">
        <UserHeader 
          user={user}
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <main className="flex-1 overflow-auto p-6">
          <Outlet context={{ user, menuItems, onMenuUpdate: handleMenuUpdate }} />
        </main>
      </div>
    </div>
  );
};

export default UserLayout;