-- Script to add missing menu items for all existing users
-- This script adds tariff, reports, and settings menu items for all users

-- Add tariff menu item for all users
INSERT INTO public.user_menu_items (
  user_id, 
  title, 
  path, 
  order_index, 
  page_type, 
  icon_name, 
  description
)
SELECT 
  id as user_id,
  'Tariff' as title,
  'tariff' as path,
  3 as order_index,
  'content' as page_type,
  'CreditCard' as icon_name,
  'Manage your tariff and billing information' as description
FROM public.profiles
WHERE role = 'user'
AND id NOT IN (
  SELECT user_id 
  FROM public.user_menu_items 
  WHERE path = 'tariff'
);

-- Add reports menu item for all users
INSERT INTO public.user_menu_items (
  user_id, 
  title, 
  path, 
  order_index, 
  page_type, 
  icon_name, 
  description
)
SELECT 
  id as user_id,
  'Reports' as title,
  'reports' as path,
  4 as order_index,
  'content' as page_type,
  'BarChart3' as icon_name,
  'View your usage reports and analytics' as description
FROM public.profiles
WHERE role = 'user'
AND id NOT IN (
  SELECT user_id 
  FROM public.user_menu_items 
  WHERE path = 'reports'
);

-- Add settings menu item for all users
INSERT INTO public.user_menu_items (
  user_id, 
  title, 
  path, 
  order_index, 
  page_type, 
  icon_name, 
  description
)
SELECT 
  id as user_id,
  'Settings' as title,
  'settings' as path,
  5 as order_index,
  'content' as page_type,
  'Settings' as icon_name,
  'Configure your account settings' as description
FROM public.profiles
WHERE role = 'user'
AND id NOT IN (
  SELECT user_id 
  FROM public.user_menu_items 
  WHERE path = 'settings'
);

-- Update the default menu creation function to include these items for new users
CREATE OR REPLACE FUNCTION public.create_default_user_menu()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create default menu for users with 'user' role
  IF NEW.role = 'user' THEN
    INSERT INTO public.user_menu_items (user_id, title, path, order_index, page_type, icon_name, description) VALUES
    (NEW.id, 'Dashboard', '/dashboard', 0, 'dashboard', 'LayoutDashboard', 'Main dashboard with overview'),
    (NEW.id, 'Profile', '/profile', 1, 'content', 'User', 'Manage your profile settings'),
    (NEW.id, 'My Menu', '/my-menu', 2, 'content', 'Menu', 'Manage your personal menu items'),
    (NEW.id, 'Tariff', 'tariff', 3, 'content', 'CreditCard', 'Manage your tariff and billing information'),
    (NEW.id, 'Reports', 'reports', 4, 'content', 'BarChart3', 'View your usage reports and analytics'),
    (NEW.id, 'Settings', 'settings', 5, 'content', 'Settings', 'Configure your account settings');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;