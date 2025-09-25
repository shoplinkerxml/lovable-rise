-- Fix RLS policy for user_menu_items table to work with the profiles table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own menu items" ON public.user_menu_items;
DROP POLICY IF EXISTS "Admins can view all user menu items" ON public.user_menu_items;

-- RLS Policy: Users can manage their own menu items
CREATE POLICY "Users can manage their own menu items" ON public.user_menu_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all user menu items (for support/management)
CREATE POLICY "Admins can view all user menu items" ON public.user_menu_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to create default menu for new users
CREATE OR REPLACE FUNCTION public.create_default_user_menu()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create default menu for users with 'user' role
  IF NEW.role = 'user' THEN
    INSERT INTO public.user_menu_items (user_id, title, path, order_index, page_type, icon_name, description) VALUES
    (NEW.id, 'Dashboard', 'dashboard', 0, 'dashboard', 'LayoutDashboard', 'Main dashboard with overview'),
    (NEW.id, 'Profile', 'profile', 1, 'content', 'User', 'Manage your profile settings');
    -- Removed 'My Menu' entry as menu-management is no longer needed
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default menu for new users
DROP TRIGGER IF EXISTS create_default_user_menu_trigger ON public.profiles;
CREATE TRIGGER create_default_user_menu_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_user_menu();