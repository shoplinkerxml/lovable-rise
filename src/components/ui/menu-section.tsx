import React, { useState } from 'react';
import { MenuItemData } from '@/providers/admin-provider';
import { MenuItemWithIcon } from './menu-item-with-icon';
import { Separator } from './separator';
import { DynamicIcon, getAutoIcon } from './dynamic-icon';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MenuSectionProps {
  title?: string;
  type: 'dashboard' | 'main' | 'settings';
  items: MenuItemData[];
  collapsed?: boolean;
  isCollapsible?: boolean;
  icon?: string | null;
  children?: MenuItemData[];
  onItemClick: (item: MenuItemData) => void;
  onItemHover: (item: MenuItemData) => void;
  isActiveItem: (item: MenuItemData) => boolean;
  buildTree: (items: MenuItemData[]) => Record<number | "root", MenuItemData[]>;
}

interface SubmenuState {
  [itemId: number]: boolean;
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  title,
  type,
  items,
  collapsed = false,
  isCollapsible = false,
  icon,
  children = [],
  onItemClick,
  onItemHover,
  isActiveItem,
  buildTree,
}) => {
  const [submenuStates, setSubmenuStates] = useState<SubmenuState>({});
  const tree = buildTree([...items, ...children]);
  
  // Don't render if no items
  if (!items.length) {
    return null;
  }

  // Toggle submenu state
  const toggleSubmenu = (itemId: number) => {
    setSubmenuStates(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const renderSectionHeader = () => {
    if (!title || collapsed) return null;
    
    return (
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex items-center gap-2">
          {icon && <DynamicIcon name={icon} className="w-3 h-3" />}
          {title}
        </div>
      </div>
    );
  };

  const shouldShowSeparator = (item: MenuItemData, index: number) => {
    return item.has_separator && index === 0;
  };

  return (
    <div className={cn("space-y-1", type === 'dashboard' && "mb-4")}>
      {renderSectionHeader()}
      
      {items.map((item, index) => {
        const hasChildren = tree[item.id]?.length > 0;
        const isExpanded = submenuStates[item.id];
        
        return (
          <div key={item.id}>
            {shouldShowSeparator(item, index) && (
              <div className="py-2">
                <Separator />
              </div>
            )}
            
            <div className="relative">
              {/* Main menu item with integrated submenu toggle */}
              {hasChildren ? (
                <button
                  onClick={() => {
                    onItemClick(item);
                    toggleSubmenu(item.id);
                  }}
                  onMouseEnter={() => onItemHover(item)}
                  className={cn(
                    "w-full text-left rounded-md text-sm transition-all duration-200 group flex items-center justify-between",
                    "px-3 py-2",
                    isActiveItem(item)
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-sm"
                      : "hover:bg-emerald-50 hover:text-[#10b981] border border-transparent hover:border-emerald-200/30 hover:shadow-sm"
                  )}
                  aria-label={`${item.title} - ${isExpanded ? "Collapse" : "Expand"} submenu`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <DynamicIcon 
                      name={item.icon_name || getAutoIcon({ 
                        title: item.title, 
                        path: item.path, 
                        page_type: item.page_type 
                      })} 
                      className={cn("w-4 h-4 mr-3 shrink-0")}
                    />
                    {!collapsed && (
                      <span className="truncate flex-1">
                        {item.title}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <div className="ml-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#10b981] transform rotate-180 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#10b981] transition-transform duration-200" />
                      )}
                    </div>
                  )}
                </button>
              ) : (
                <MenuItemWithIcon
                  item={item}
                  isActive={isActiveItem(item)}
                  collapsed={collapsed}
                  onClick={onItemClick}
                  onHover={onItemHover}
                  variant={type === 'dashboard' ? 'dashboard' : 'default'}
                />
              )}
              
              {/* Render children if not collapsed, has children, and is expanded */}
              {!collapsed && hasChildren && isExpanded && (
                <div className="ml-6 mt-1 space-y-1 border-l border-gray-100 pl-3">
                  {tree[item.id].map((child) => (
                    <MenuItemWithIcon
                      key={child.id}
                      item={child}
                      isActive={isActiveItem(child)}
                      collapsed={false}
                      onClick={onItemClick}
                      onHover={onItemHover}
                      variant="child"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuSection;