import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserMenuService, UserMenuItem } from "@/lib/user-menu-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { useI18n } from "@/providers/i18n-provider";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { toast } from "sonner";
import TariffPage from "./TariffPage";

interface UserDashboardContextType {
  user: UserProfile;
  menuItems: UserMenuItem[];
  onMenuUpdate: () => void;
}

const UserMenuContentByPath = () => {
  const { path } = useParams();
  const navigate = useNavigate();
  const { user, menuItems, onMenuUpdate } = useOutletContext<UserDashboardContextType>();
  const { t } = useI18n();
  const [menuItem, setMenuItem] = useState<UserMenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get the full path including any nested routes
  const location = useLocation();
  const fullPath = location.pathname.replace('/user/', '');

  useEffect(() => {
    const loadMenuItem = async () => {
      // Use the full path instead of just the path parameter
      const currentPath = fullPath || path;
      
      if (!currentPath) {
        setError("No menu item path provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, try to find the item in the context menu items
        const normalizedPath = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
        
        const foundItem = menuItems.find(item => {
          const itemPath = item.path.startsWith('/') ? item.path.substring(1) : item.path;
          return itemPath === normalizedPath;
        });
        
        if (foundItem) {
          setMenuItem(foundItem);
          setLoading(false);
          return;
        }

        // If not found in context, try to get it from the database by path
        const dbItem = await UserMenuService.getMenuItemByPath(normalizedPath, user.id);
        if (dbItem) {
          setMenuItem(dbItem);
          setLoading(false);
          return;
        }

        // If still not found, create a virtual item with the path as title
        const pathParts = normalizedPath.split('/').filter(part => part.length > 0);
        const title = pathParts.length > 0 
          ? pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : normalizedPath;
        
        // Create a virtual menu item
        const virtualItem: UserMenuItem = {
          id: -1, // Virtual ID
          user_id: user.id,
          title: title,
          path: normalizedPath,
          order_index: 0,
          is_active: true,
          page_type: 'content',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setMenuItem(virtualItem);
        setLoading(false);
      } catch (err) {
        console.error("Error loading menu item:", err);
        setError("Failed to load menu item");
        toast.error(t("failed_load_menu_item"));
      } finally {
        setLoading(false);
      }
    };

    loadMenuItem();
  }, [path, fullPath, user.id, t, menuItems]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error || !menuItem) {
    // Instead of showing just an error, display a page with title and description
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <DynamicIcon 
            name="FileText" 
            className="h-8 w-8 text-emerald-600" 
          />
          <div>
            <h1 className="text-2xl font-bold">{path}</h1>
            <p className="text-sm text-muted-foreground">This page is currently empty</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Page Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">This page has not been configured yet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <DynamicIcon 
          name={menuItem.icon_name || "FileText"} 
          className="h-8 w-8 text-emerald-600" 
        />
        <div>
          <h1 className="text-2xl font-bold">{menuItem.title}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("content")}</CardTitle>
        </CardHeader>
        <CardContent>
          {menuItem.path === 'tariff' ? (
            <TariffPage />
          ) : menuItem.page_type === 'content' && menuItem.content_data ? (
            <div className="prose max-w-none">
              {menuItem.content_data.content ? (
                <div dangerouslySetInnerHTML={{ __html: menuItem.content_data.content }} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t("no_content_available")}</p>
                </div>
              )}
            </div>
          ) : menuItem.page_type === 'form' ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Form content would be displayed here.</p>
            </div>
          ) : menuItem.page_type === 'list' ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">List content would be displayed here.</p>
            </div>
          ) : menuItem.page_type === 'dashboard' ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Dashboard content would be displayed here.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Custom page content would be displayed here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserMenuContentByPath;