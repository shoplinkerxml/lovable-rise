-- Update RLS policies for user_menu_items to allow shared access
-- This migration updates the Row Level Security policies to allow all authenticated users 
-- to view menu items, since user menu items are shared across all users

-- Enable RLS on the table
ALTER TABLE public.user_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view menu items (since they are shared)
DROP POLICY IF EXISTS "All users can view shared menu items" ON public.user_menu_items;
CREATE POLICY "All users can view shared menu items" ON public.user_menu_items
  FOR SELECT TO authenticated
  USING (true);

-- RLS Policy: Users can manage their own menu items (for user-specific operations)
DROP POLICY IF EXISTS "Users can manage their own menu items" ON public.user_menu_items;
CREATE POLICY "Users can manage their own menu items" ON public.user_menu_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can manage all user menu items (for support/management)
DROP POLICY IF EXISTS "Admins can manage all user menu items" ON public.user_menu_items;
CREATE POLICY "Admins can manage all user menu items" ON public.user_menu_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.user_menu_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_menu_items_id_seq TO authenticated;