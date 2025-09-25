import { useState, useEffect, createContext, useContext } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SheetNoOverlay, SheetNoOverlayContent, SheetNoOverlayHeader, SheetNoOverlayTitle, SheetNoOverlayTrigger } from "@/components/ui/sheet-no-overlay";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sun, Moon, AlignJustify } from "lucide-react";
import { ProfileTrigger } from "@/components/ui/profile-trigger";
import { ProfileSheetContent } from "@/components/ui/profile-sheet-content";
import { UserProfile as UIUserProfile } from "@/components/ui/profile-types";
import { useI18n } from "@/providers/i18n-provider";
import { supabase } from "@/integrations/supabase/client";
import { ProfileService } from "@/lib/profile-service";
import { UserMenuService, UserMenuItem } from "@/lib/user-menu-service";
import { UserAuthService } from "@/lib/user-auth-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Static routes that are always available regardless of database state
const STATIC_ROUTES: Record<string, Partial<UserMenuItem>> = {
  '/dashboard': {
    id: -1,
    title: 'Dashboard',
    path: '/dashboard',
    page_type: 'dashboard',
    is_active: true,
    order_index: 0,
    created_at: new Date().toISOString(),
    icon_name: 'layout-dashboard'
  },
  '/profile': {
    id: -2,
    title: 'Profile',
    path: '/profile',
    page_type: 'content',
    is_active: true,
    order_index: 1,
    created_at: new Date().toISOString(),
    icon_name: 'user'
  }
};

interface UserMenuContextState {
  menuItems: UserMenuItem[];
  activeMenuItem: UserMenuItem | null;
  menuLoading: boolean;
  setActiveMenuItem: (item: UserMenuItem | null) => void;
  navigateToMenuItem: (item: UserMenuItem) => void;
  refreshMenuItems: () => Promise<void>;
}

const UserMenuContext = createContext<UserMenuContextState | null>(null);

export const useUserMenu = () => {
  const context = useContext(UserMenuContext);
  if (!context) {
    throw new Error('useUserMenu must be used within UserMenuProvider');
  }
  return context;
};

const UserMenuProvider: React.FC<{ children: React.ReactNode; userId: string }> = ({ children, userId }) => {
  const [menuItems, setMenuItems] = useState<UserMenuItem[]>([]);
  const [activeMenuItem, setActiveMenuItemState] = useState<UserMenuItem | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load menu items on mount
  const loadMenuItems = async () => {
    setMenuLoading(true);
    try {
      const items = await UserMenuService.getMenuHierarchy(userId);
      setMenuItems(items);
    } catch (error) {
      console.error("Failed to load user menu items:", error);
      toast.error("Failed to load menu items");
    } finally {
      setMenuLoading(false);
    }
  };

  // Refresh menu items
  const refreshMenuItems = async () => {
    await loadMenuItems();
  };

  // Find active menu item based on current path with static route fallback
  const findActiveMenuItem = (currentPath: string, items: UserMenuItem[]) => {
    const userPath = currentPath.replace('/user', '');
    
    // First try to find in loaded menu items from database
    // For database items, the path is stored without the leading slash
    const menuItem = items.find(item => {
      // Ensure both paths are in the same format for comparison
      const itemPath = item.path.startsWith('/') ? item.path.substring(1) : item.path;
      const normalizedUserPath = userPath.startsWith('/') ? userPath.substring(1) : userPath;
      return itemPath === normalizedUserPath;
    });
    
    if (menuItem) {
      return menuItem;
    }
    
    // For static routes, create virtual menu item if not found in database
    const normalizedUserPath = userPath.startsWith('/') ? userPath : `/${userPath}`;
    if (STATIC_ROUTES[normalizedUserPath]) {
      return {
        ...STATIC_ROUTES[normalizedUserPath],
        // Ensure all required fields are present
        id: STATIC_ROUTES[normalizedUserPath].id!,
        title: STATIC_ROUTES[normalizedUserPath].title!,
        path: STATIC_ROUTES[normalizedUserPath].path!.substring(1), // Remove leading slash
        page_type: STATIC_ROUTES[normalizedUserPath].page_type!,
        is_active: STATIC_ROUTES[normalizedUserPath].is_active!,
        order_index: STATIC_ROUTES[normalizedUserPath].order_index!,
        created_at: STATIC_ROUTES[normalizedUserPath].created_at!
      } as UserMenuItem;
    }
    
    return null;
  };

  // Set active menu item
  const setActiveMenuItem = (item: UserMenuItem | null) => {
    setActiveMenuItemState(item);
  };

  // Navigate to menu item
  const navigateToMenuItem = (item: UserMenuItem) => {
    setActiveMenuItem(item);
    // Ensure path doesn't have leading slash to prevent double slashes
    const cleanPath = item.path.startsWith('/') ? item.path.substring(1) : item.path;
    navigate(`/user/${cleanPath}`, { replace: false });
  };

  // Initialize menu items on mount
  useEffect(() => {
    loadMenuItems();
  }, [userId]);

  // Update active menu item when location changes
  useEffect(() => {
    const userPath = location.pathname.replace('/user', '');
    
    // Handle static routes immediately, even during menu loading
    const normalizedUserPath = userPath.startsWith('/') ? userPath : `/${userPath}`;
    if (STATIC_ROUTES[normalizedUserPath]) {
      const staticMenuItem = findActiveMenuItem(location.pathname, []);
      if (staticMenuItem && staticMenuItem.id !== activeMenuItem?.id) {
        setActiveMenuItem(staticMenuItem);
      }
      return;
    }
    
    // For dynamic routes, wait for menu items to load
    if (menuItems.length > 0) {
      const activeItem = findActiveMenuItem(location.pathname, menuItems);
      if (activeItem && activeItem.id !== activeMenuItem?.id) {
        setActiveMenuItem(activeItem);
      }
    }
  }, [location.pathname, menuItems, activeMenuItem?.id, findActiveMenuItem, setActiveMenuItem]);

  const contextValue: UserMenuContextState = {
    menuItems,
    activeMenuItem,
    menuLoading,
    setActiveMenuItem,
    navigateToMenuItem,
    refreshMenuItems,
  };

  return (
    <UserMenuContext.Provider value={contextValue}>
      {children}
    </UserMenuContext.Provider>
  );
};

const UserLayout = () => {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [uiUserProfile, setUiUserProfile] = useState<UIUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { user: currentUser, session, error } = await UserAuthService.getCurrentUser();
      
      if (error || !currentUser || !session) {
        toast.error(t("please_log_in"));
        return;
      }

      // Try to get existing profile first
      const profile = await ProfileService.getProfile(currentUser.id);
      
      if (profile) {
        // Use existing profile data
        const finalAvatarUrl = profile.avatar_url && profile.avatar_url.trim() !== '' 
          ? profile.avatar_url 
          : '/placeholder.svg';
        
        setUser({
          id: currentUser.id,
          email: currentUser.email || '',
          name: profile.name || 'User',
          role: profile.role || 'user',
          status: 'active',
          avatar_url: finalAvatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        // Set UI user profile for the header - ensure role is correctly set to 'user'
        setUiUserProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          name: profile.name || 'User',
          role: profile.role === 'admin' || profile.role === 'manager' ? profile.role : 'user',
          avatarUrl: finalAvatarUrl
        });
      } else {
        console.error('Failed to ensure user profile');
        toast.error(t("failed_load_user_profile"));
        return;
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error(t("failed_load_user_data"));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/user-auth";
  };

  const handleProfileNavigation = (path: string) => {
    setProfileSheetOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setProfileSheetOpen(false);
    signOut();
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  const isActive = (path: string) => {
    // For default routes, we need to check against the full path
    if (path === "/user/dashboard" || path === "/user/profile") {
      return window.location.pathname === path;
    }
    // For custom menu items, ensure path doesn't have leading slash and check if the current path ends with the menu item path
    // This prevents false positives when one path is a substring of another
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return window.location.pathname === `/user/${cleanPath}` || 
           (window.location.pathname.startsWith(`/user/${cleanPath}`) && 
            (window.location.pathname.length === `/user/${cleanPath}`.length || 
             window.location.pathname.charAt(`/user/${cleanPath}`.length) === '/'));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user || !uiUserProfile) {
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
    <UserMenuProvider userId={user.id}>
      <UserLayoutContent 
        user={user}
        uiUserProfile={uiUserProfile}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        isActive={isActive}
        toggleTheme={toggleTheme}
        lang={lang}
        setLang={setLang}
        t={t}
        profileSheetOpen={profileSheetOpen}
        setProfileSheetOpen={setProfileSheetOpen}
        handleProfileNavigation={handleProfileNavigation}
        handleLogout={handleLogout}
      />
    </UserMenuProvider>
  );
};

const UserLayoutContent = ({ 
  user,
  uiUserProfile,
  sidebarCollapsed,
  setSidebarCollapsed,
  isActive,
  toggleTheme,
  lang,
  setLang,
  t,
  profileSheetOpen,
  setProfileSheetOpen,
  handleProfileNavigation,
  handleLogout
}: {
  user: UserProfile;
  uiUserProfile: UIUserProfile;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isActive: (path: string) => boolean;
  toggleTheme: () => void;
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
  profileSheetOpen: boolean;
  setProfileSheetOpen: (open: boolean) => void;
  handleProfileNavigation: (path: string) => void;
  handleLogout: () => void;
}) => {
  const { menuItems, menuLoading, activeMenuItem, navigateToMenuItem } = useUserMenu();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-emerald-50/40 dark:bg-neutral-950 flex">
      {/* User Sidebar */}
      <aside className={`hidden md:flex ${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 shrink-0 border-r bg-background p-4 flex-col gap-33`}>
        {/* Logo/Header */}
        <div className="flex items-center justify-between">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">UG</span>
              </div>
              <span className="font-semibold">UserGrow</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 p-0"
          >
            {sidebarCollapsed ? (
              <AlignJustify className="h-4 w-4" />
            ) : (
              <AlignJustify className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          {/* Default Menu Items */}
          {!sidebarCollapsed && (
            <div className="mb-4">

            </div>
          )}
          
          {/* User Custom Menu Items */}
          {menuItems.length > 0 && (
            <>
              {!sidebarCollapsed && (
                <div className="mt-6 mb-4">
                  <div className="flex items-center justify-between px-3 mb-2">

                  </div>
                </div>
              )}
              
              {menuItems.map(item => (
                <div 
                  key={item.id}
                  className={cn(
                    "group relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                    activeMenuItem?.id === item.id
                      ? "bg-emerald-100 text-emerald-900"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => navigateToMenuItem(item)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="h-4 w-4">📄</span>
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-background flex items-center px-4 md:px-6 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden"
            >
              <AlignJustify className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-transparent cursor-pointer">
              <Sun className="h-5 w-5 hidden dark:block" />
              <Moon className="h-5 w-5 block dark:hidden" />
            </Button>
            
            {/* Language Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-transparent cursor-pointer" title={lang === "uk" ? "Українська" : "English"}>
                  <span className="text-lg">{lang === "uk" ? "🇺🇦" : "🇺🇸"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang("uk")}>🇺🇦 Українська</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("en")}>🇺🇸 English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* User Profile */}
            <SheetNoOverlay open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
              <SheetNoOverlayTrigger asChild>
                <ProfileTrigger
                  userProfile={uiUserProfile}
                  position="header"
                  onClick={() => setProfileSheetOpen(true)}
                />
              </SheetNoOverlayTrigger>
              <SheetNoOverlayContent side="right" className="w-96">
                <SheetNoOverlayHeader>
                  <SheetNoOverlayTitle>{t("user_profile")}</SheetNoOverlayTitle>
                </SheetNoOverlayHeader>
                <ProfileSheetContent
                  userProfile={uiUserProfile}
                  onNavigate={handleProfileNavigation}
                  onLogout={handleLogout}
                  onClose={() => setProfileSheetOpen(false)}
                />
              </SheetNoOverlayContent>
            </SheetNoOverlay>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            <Outlet context={{ user, menuItems, onMenuUpdate: () => {} }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;