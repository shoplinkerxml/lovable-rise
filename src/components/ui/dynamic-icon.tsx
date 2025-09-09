import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FormInput,
  Clipboard,
  CheckCircle,
  Users,
  UserCheck,
  UserCog,
  BarChart3,
  TrendingUp,
  FileBarChart,
  Edit3,
  Layers,
  Settings,
  Cog,
  Sliders,
  Shield,
  Lock,
  Key,
  LogOut,
  DoorOpen,
  Package,
  Menu,
  LayoutGrid,
  MoveHorizontal,
  MoveVertical,
  Palette,
  Circle,
  Home,
  User,
  FileSpreadsheet,
  Layout,
  Code,
  Image,
  Bell,
  CreditCard,
  DollarSign,
  Tags,
  LucideIcon,
} from 'lucide-react';

// Icon mapping configuration
const MENU_ICONS: Record<string, LucideIcon> = {
  // Dashboard & Home
  'layout-dashboard': LayoutDashboard,
  dashboard: LayoutDashboard,
  home: Home,
  
  // Forms
  'file-text': FileText,
  forms: FileText,
  'form-input': FormInput,
  'forms-elements': FormInput,
  clipboard: Clipboard,
  'forms-layouts': Clipboard,
  'check-circle': CheckCircle,
  'forms-validation': CheckCircle,
  'file-spreadsheet': FileSpreadsheet,
  
  // Layout specific
  'layout-grid': LayoutGrid,
  layout: Layout,
  pages: Layout,
  'move-horizontal': MoveHorizontal,
  'move-vertical': MoveVertical,
  palette: Palette,
  
  // Users & Management
  users: Users,
  user: User,
  profile: User,
  'user-profile': UserCheck,
  'user-management': UserCog,
  'user-check': UserCheck,
  'user-cog': UserCog,
  
  // Reports & Analytics
  'bar-chart-3': BarChart3,
  reports: BarChart3,
  analytics: BarChart3,
  'trending-up': TrendingUp,
  'file-bar-chart': FileBarChart,
  statistics: FileBarChart,
  
  // Content Management
  content: FileText,
  'edit-3': Edit3,
  layers: Layers,
  categories: Layers,
  package: Package,
  products: Package,
  
  // Pricing & Commerce
  'credit-card': CreditCard,
  pricing: CreditCard,
  'pricing-plans': CreditCard,
  'dollar-sign': DollarSign,
  prices: DollarSign,
  money: DollarSign,
  tags: Tags,
  discounts: Tags,
  
  // API & Development
  code: Code,
  api: Code,
  
  // Media & Notifications
  image: Image,
  media: Image,
  bell: Bell,
  notifications: Bell,
  
  // Settings & Configuration
  settings: Settings,
  configuration: Cog,
  cog: Cog,
  sliders: Sliders,
  preferences: Sliders,
  
  // Security & Permissions
  shield: Shield,
  permissions: Shield,
  lock: Lock,
  security: Lock,
  key: Key,
  access: Key,
  
  // Navigation & System
  menu: Menu,
  'log-out': LogOut,
  logout: LogOut,
  'door-open': DoorOpen,
  exit: DoorOpen,
  
  // Fallback
  circle: Circle,
} as const;

export interface DynamicIconProps {
  name?: string | null;
  className?: string;
  size?: number;
  fallback?: LucideIcon;
}

/**
 * Dynamic icon component that renders Lucide icons based on name
 * Falls back to a default icon if the name is not found
 */
export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name,
  className = "w-4 h-4",
  size,
  fallback = Circle,
}) => {
  // Get the icon component from the mapping
  const IconComponent = name ? MENU_ICONS[name] || fallback : fallback;
  
  return (
    <IconComponent 
      className={className} 
      size={size}
      aria-hidden="true"
    />
  );
};

/**
 * Hook to get icon component by name
 * Useful for getting the icon component without rendering
 */
export const useIcon = (name?: string | null): LucideIcon => {
  return name ? MENU_ICONS[name] || Circle : Circle;
};

/**
 * Get all available icon names
 * Useful for admin interfaces to select icons
 */
export const getAvailableIcons = (): string[] => {
  return Object.keys(MENU_ICONS).sort();
};

/**
 * Check if an icon name exists in the mapping
 */
export const isValidIconName = (name: string): boolean => {
  return name in MENU_ICONS;
};

/**
 * Auto-assign icon based on menu item properties
 * Used as fallback when no explicit icon is set
 */
export const getAutoIcon = (item: { title: string; path: string; page_type?: string }): string => {
  const title = item.title.toLowerCase();
  const path = item.path.toLowerCase();
  
  // Page type-based icons
  if (item.page_type === 'dashboard') return 'layout-dashboard';
  if (item.page_type === 'form') return 'file-text';
  if (item.page_type === 'list') return 'bar-chart-3';
  
  // Title-based mapping (English and Ukrainian)
  if (title.includes('dashboard') || title.includes('панель')) return 'layout-dashboard';
  if (title.includes('user') || title.includes('користувач')) return 'users';
  if (title.includes('setting') || title.includes('налаштування')) return 'settings';
  if (title.includes('form') || title.includes('форм')) return 'file-text';
  if (title.includes('report') || title.includes('звіт')) return 'bar-chart-3';
  if (title.includes('analytic') || title.includes('аналітика')) return 'trending-up';
  if (title.includes('content') || title.includes('контент')) return 'file-text';
  if (title.includes('categor') || title.includes('категор')) return 'layers';
  if (title.includes('product') || title.includes('товар')) return 'package';
  if (title.includes('permission') || title.includes('дозвол')) return 'shield';
  if (title.includes('api')) return 'code';
  if (title.includes('media') || title.includes('медіа')) return 'image';
  if (title.includes('notification') || title.includes('сповіщення')) return 'bell';
  if (title.includes('pricing') || title.includes('price') || title.includes('тариф') || title.includes('ціна')) return 'credit-card';
  if (title.includes('plan') || title.includes('subscription') || title.includes('план')) return 'credit-card';
  
  // Path-based mapping
  if (path.includes('/dashboard')) return 'layout-dashboard';
  if (path.includes('/users') || path.includes('/користувачі')) return 'users';
  if (path.includes('/settings') || path.includes('/налаштування')) return 'settings';
  if (path.includes('/forms') || path.includes('/форми')) return 'file-text';
  if (path.includes('/reports') || path.includes('/звіти')) return 'bar-chart-3';
  if (path.includes('/analytics') || path.includes('/аналітика')) return 'trending-up';
  if (path.includes('/content') || path.includes('/контент')) return 'file-text';
  if (path.includes('/categories') || path.includes('/категорії')) return 'layers';
  if (path.includes('/products') || path.includes('/товари')) return 'package';
  if (path.includes('/permissions')) return 'shield';
  if (path.includes('/api')) return 'code';
  if (path.includes('/media')) return 'image';
  if (path.includes('/personal') || path.includes('/profile')) return 'user';
  
  // Default icon
  return 'circle';
};