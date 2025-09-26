import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserMenuService, UserMenuItem, CreateUserMenuItem, UpdateUserMenuItem, MenuReorderItem } from "@/lib/user-menu-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { useI18n } from "@/providers/i18n-provider";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { toast } from "sonner";
import { Plus, Edit3, Trash2, Copy, MoveUp, MoveDown } from "lucide-react";

interface UserDashboardContextType {
  user: UserProfile;
  menuItems: UserMenuItem[];
  onMenuUpdate: () => void;
}

const UserMenuManagement = () => {
  const { user, menuItems, onMenuUpdate } = useOutletContext<UserDashboardContextType>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserMenuItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserMenuItem | null>(null);
  const [newItem, setNewItem] = useState<CreateUserMenuItem>({
    title: "",
    path: "",
    page_type: "content",
    icon_name: "FileText"
  });

  useEffect(() => {
    setItems(menuItems);
    setLoading(false);
  }, [menuItems]);

  // Function to determine the appropriate icon based on title or path
  const getAutoIconForItem = (title: string, path: string): string => {
    const lowerTitle = title.toLowerCase();
    const lowerPath = path.toLowerCase();
    
    // Check for supplier-related terms
    if (lowerTitle.includes('supplier') || lowerTitle.includes('постачальник')) {
      return 'Truck';
    }
    
    if (lowerPath.includes('supplier') || lowerPath.includes('постачальник')) {
      return 'Truck';
    }
    
    // Check for shop-related terms
    if (lowerTitle.includes('shop') || lowerTitle.includes('магазин')) {
      return 'Store';
    }
    
    if (lowerPath.includes('shop') || lowerPath.includes('магазин')) {
      return 'Store';
    }
    
    // Check for payment-related terms
    if (lowerTitle.includes('payment') || lowerTitle.includes('платеж')) {
      return 'CreditCard';
    }
    
    if (lowerPath.includes('payment') || lowerPath.includes('платеж')) {
      return 'CreditCard';
    }
    
    // Fall back to the default FileText icon
    return 'FileText';
  };

  const handleCreateItem = async () => {
    try {
      if (!newItem.title || !newItem.path) {
        toast.error(t("title_and_path_required"));
        return;
      }

      // Validate path uniqueness
      const pathExists = items.some(item => item.path === newItem.path);
      if (pathExists) {
        toast.error(t("path_already_exists"));
        return;
      }

      // Auto-assign icon if not explicitly set
      const itemToCreate = {
        ...newItem,
        icon_name: newItem.icon_name || getAutoIconForItem(newItem.title, newItem.path)
      };

      await UserMenuService.createMenuItem(user.id, itemToCreate);
      onMenuUpdate();
      setNewItem({
        title: "",
        path: "",
        page_type: "content",
        icon_name: "FileText"
      });
      setIsDialogOpen(false);
      toast.success(t("menu_item_created"));
    } catch (err) {
      console.error("Error creating menu item:", err);
      toast.error(t("failed_create_menu_item"));
    }
  };

  const handleEditItem = (item: UserMenuItem) => {
    setEditingItem(item);
    setNewItem({
      title: item.title,
      path: item.path,
      page_type: item.page_type,
      icon_name: item.icon_name || "FileText",
      description: item.description,
      content_data: item.content_data
    });
    setIsDialogOpen(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      if (!newItem.title || !newItem.path) {
        toast.error(t("title_and_path_required"));
        return;
      }

      // Validate path uniqueness (excluding current item)
      const pathExists = items.some(item => item.path === newItem.path && item.id !== editingItem.id);
      if (pathExists) {
        toast.error(t("path_already_exists"));
        return;
      }

      // Auto-assign icon if not explicitly set
      const icon_name = newItem.icon_name || getAutoIconForItem(newItem.title, newItem.path);

      const updateData: UpdateUserMenuItem = {
        title: newItem.title,
        path: newItem.path,
        page_type: newItem.page_type,
        icon_name: icon_name,
        description: newItem.description,
        content_data: newItem.content_data
      };

      await UserMenuService.updateMenuItem(editingItem.id, user.id, updateData);
      onMenuUpdate();
      setEditingItem(null);
      setNewItem({
        title: "",
        path: "",
        page_type: "content",
        icon_name: "FileText"
      });
      setIsDialogOpen(false);
      toast.success(t("menu_item_updated"));
    } catch (err) {
      console.error("Error updating menu item:", err);
      toast.error(t("failed_update_menu_item"));
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await UserMenuService.deleteMenuItem(itemId, user.id);
      onMenuUpdate();
      toast.success(t("menu_item_deleted"));
    } catch (err) {
      console.error("Error deleting menu item:", err);
      toast.error(t("failed_delete_menu_item"));
    }
  };

  const handleDuplicateItem = async (item: UserMenuItem) => {
    try {
      await UserMenuService.duplicateMenuItem(item.id, user.id);
      onMenuUpdate();
      toast.success(t("menu_item_duplicated"));
    } catch (err) {
      console.error("Error duplicating menu item:", err);
      toast.error(t("failed_duplicate_menu_item"));
    }
  };

  const moveItem = async (itemId: number, direction: 'up' | 'down') => {
    try {
      const itemIndex = items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return;

      let newIndex = itemIndex;
      if (direction === 'up' && itemIndex > 0) {
        newIndex = itemIndex - 1;
      } else if (direction === 'down' && itemIndex < items.length - 1) {
        newIndex = itemIndex + 1;
      } else {
        return; // Can't move further in this direction
      }

      // Create proper reorder items with correct order indices
      const reorderedItems: MenuReorderItem[] = [
        { id: items[itemIndex].id, order_index: items[newIndex].order_index },
        { id: items[newIndex].id, order_index: items[itemIndex].order_index }
      ];

      await UserMenuService.reorderMenuItems(user.id, reorderedItems);
      onMenuUpdate();
    } catch (err) {
      console.error("Error reordering menu items:", err);
      toast.error(t("failed_reorder_menu_items"));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t("menu_management")}</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setNewItem({
                title: "",
                path: "",
                page_type: "content",
                icon_name: "FileText"
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              {t("add_menu_item")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? t("edit_menu_item") : t("create_menu_item")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t("title")}</label>
                <Input
                  value={newItem.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    // Auto-update icon when title changes
                    const newIcon = newItem.icon_name === "FileText" || !newItem.icon_name 
                      ? getAutoIconForItem(newTitle, newItem.path) 
                      : newItem.icon_name;
                    setNewItem({...newItem, title: newTitle, icon_name: newIcon});
                  }}
                  placeholder={t("enter_title")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("path")}</label>
                <Input
                  value={newItem.path}
                  onChange={(e) => {
                    const newPath = e.target.value;
                    // Auto-update icon when path changes
                    const newIcon = newItem.icon_name === "FileText" || !newItem.icon_name 
                      ? getAutoIconForItem(newItem.title, newPath) 
                      : newItem.icon_name;
                    setNewItem({...newItem, path: newPath, icon_name: newIcon});
                  }}
                  placeholder={t("enter_path")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("page_type")}</label>
                <Select
                  value={newItem.page_type || "content"}
                  onValueChange={(value: any) => setNewItem({...newItem, page_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_page_type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content">{t("content")}</SelectItem>
                    <SelectItem value="form">{t("form")}</SelectItem>
                    <SelectItem value="dashboard">{t("dashboard")}</SelectItem>
                    <SelectItem value="list">{t("list")}</SelectItem>
                    <SelectItem value="custom">{t("custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("icon")}</label>
                <Input
                  value={newItem.icon_name || ""}
                  onChange={(e) => setNewItem({...newItem, icon_name: e.target.value})}
                  placeholder={t("enter_icon_name")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t("description")}</label>
                <Textarea
                  value={newItem.description || ""}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  placeholder={t("enter_description")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={editingItem ? handleUpdateItem : handleCreateItem}>
                  {editingItem ? t("update") : t("create")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("your_menu_items")}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("no_menu_items")}</p>
              <div className="mt-4">
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("create_first_menu_item")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {items
                .sort((a, b) => a.order_index - b.order_index)
                .map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <DynamicIcon 
                        name={item.icon_name || "FileText"} 
                        className="h-5 w-5 text-emerald-600" 
                      />
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          /user/{item.path} • {item.page_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveItem(item.id, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => moveItem(item.id, 'down')}
                        disabled={index === items.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDuplicateItem(item)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserMenuManagement;