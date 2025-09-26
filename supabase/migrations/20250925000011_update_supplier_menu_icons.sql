-- Update supplier-related menu items to use Truck icon instead of Circle
-- This migration updates existing menu items that relate to suppliers to use a more relevant icon

-- Update menu items with supplier in title (English)
UPDATE public.user_menu_items 
SET icon_name = 'Truck'
WHERE title ILIKE '%supplier%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with supplier in path (English)
UPDATE public.user_menu_items 
SET icon_name = 'Truck'
WHERE path ILIKE '%supplier%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with постачальник in title (Ukrainian)
UPDATE public.user_menu_items 
SET icon_name = 'Truck'
WHERE title ILIKE '%постачальник%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with постачальник in path (Ukrainian)
UPDATE public.user_menu_items 
SET icon_name = 'Truck'
WHERE path ILIKE '%постачальник%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Also update items with exact title "Постачальника"
UPDATE public.user_menu_items 
SET icon_name = 'Truck'
WHERE title = 'Постачальника'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with shop in title (English)
UPDATE public.user_menu_items 
SET icon_name = 'Store'
WHERE title ILIKE '%shop%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with shop in path (English)
UPDATE public.user_menu_items 
SET icon_name = 'Store'
WHERE path ILIKE '%shop%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with магазин in title (Ukrainian)
UPDATE public.user_menu_items 
SET icon_name = 'Store'
WHERE title ILIKE '%магазин%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with магазин in path (Ukrainian)
UPDATE public.user_menu_items 
SET icon_name = 'Store'
WHERE path ILIKE '%магазин%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with payment in title (English)
UPDATE public.user_menu_items 
SET icon_name = 'CreditCard'
WHERE title ILIKE '%payment%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with payment in path (English)
UPDATE public.user_menu_items 
SET icon_name = 'CreditCard'
WHERE path ILIKE '%payment%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with платеж in title (Ukrainian/Russian)
UPDATE public.user_menu_items 
SET icon_name = 'CreditCard'
WHERE title ILIKE '%платеж%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update menu items with платеж in path (Ukrainian/Russian)
UPDATE public.user_menu_items 
SET icon_name = 'CreditCard'
WHERE path ILIKE '%платеж%'
AND (icon_name IS NULL OR icon_name = 'circle' OR icon_name = 'Circle' OR icon_name = '');

-- Update the default menu creation function to use Truck icon for supplier items
CREATE OR REPLACE FUNCTION public.create_default_user_menu()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create default menu for users with 'user' role
  IF NEW.role = 'user' THEN
    INSERT INTO public.user_menu_items (user_id, title, path, order_index, page_type, icon_name, description) VALUES
    (NEW.id, 'Dashboard', 'dashboard', 0, 'dashboard', 'LayoutDashboard', 'Main dashboard with overview'),
    (NEW.id, 'Profile', 'profile', 1, 'content', 'User', 'Manage your profile settings'),
    (NEW.id, 'My Menu', 'my-menu', 2, 'content', 'Menu', 'Manage your personal menu items');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;