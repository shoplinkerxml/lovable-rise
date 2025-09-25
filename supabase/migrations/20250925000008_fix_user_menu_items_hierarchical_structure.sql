-- Fix user_menu_items table structure to ensure proper hierarchical menu support
-- This migration ensures the table has all required columns and constraints for hierarchical menu functionality

-- Ensure all required columns exist with correct types
ALTER TABLE public.user_menu_items 
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'content' CHECK (page_type IN ('content', 'form', 'dashboard', 'list', 'custom')),
ADD COLUMN IF NOT EXISTS content_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS icon_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Ensure foreign key constraints exist
ALTER TABLE public.user_menu_items 
DROP CONSTRAINT IF EXISTS fk_user_menu_items_parent_id,
ADD CONSTRAINT fk_user_menu_items_parent_id 
FOREIGN KEY (parent_id) REFERENCES public.user_menu_items(id) ON DELETE CASCADE;

-- Ensure user_id foreign key constraint exists (will be updated when profiles table is ready)
-- ALTER TABLE public.user_menu_items 
-- ADD CONSTRAINT fk_user_menu_items_user_id 
-- FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure unique constraint on user_id + path
ALTER TABLE public.user_menu_items 
DROP CONSTRAINT IF EXISTS user_menu_items_user_id_path_key,
ADD CONSTRAINT user_menu_items_user_id_path_key UNIQUE (user_id, path);

-- Recreate indexes for better performance
DROP INDEX IF EXISTS idx_user_menu_items_user_id;
DROP INDEX IF EXISTS idx_user_menu_items_parent_id;
DROP INDEX IF EXISTS idx_user_menu_items_order;
DROP INDEX IF EXISTS idx_user_menu_items_active;

CREATE INDEX idx_user_menu_items_user_id ON public.user_menu_items(user_id);
CREATE INDEX idx_user_menu_items_parent_id ON public.user_menu_items(parent_id);
CREATE INDEX idx_user_menu_items_active ON public.user_menu_items(is_active);
CREATE INDEX idx_user_menu_items_order ON public.user_menu_items(user_id, parent_id, order_index);

-- Update the timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_user_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the timestamp trigger exists
DROP TRIGGER IF EXISTS update_user_menu_items_updated_at_trigger ON public.user_menu_items;
CREATE TRIGGER update_user_menu_items_updated_at_trigger
  BEFORE UPDATE ON public.user_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_menu_items_updated_at();

-- Update existing records with proper default values
UPDATE public.user_menu_items 
SET 
  user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id = '00000000-0000-0000-0000-000000000000' OR user_id IS NULL;

-- Set default page_type for existing records
UPDATE public.user_menu_items 
SET page_type = 'content' 
WHERE page_type IS NULL;

-- Set default content_data for existing records
UPDATE public.user_menu_items 
SET content_data = '{}'::jsonb 
WHERE content_data IS NULL;

-- Ensure RLS policies are correctly set
ALTER TABLE public.user_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own menu items
DROP POLICY IF EXISTS "Users can manage their own menu items" ON public.user_menu_items;
CREATE POLICY "Users can manage their own menu items" ON public.user_menu_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all user menu items (for support/management)
DROP POLICY IF EXISTS "Admins can view all user menu items" ON public.user_menu_items;
CREATE POLICY "Admins can view all user menu items" ON public.user_menu_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update the default menu creation function to include all necessary fields
CREATE OR REPLACE FUNCTION public.create_default_user_menu()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create default menu for users with 'user' role
  IF NEW.role = 'user' THEN
    INSERT INTO public.user_menu_items (
      user_id, 
      title, 
      path, 
      order_index, 
      page_type, 
      icon_name, 
      description,
      content_data
    ) VALUES
    (
      NEW.id, 
      'Dashboard', 
      'dashboard', 
      0, 
      'dashboard', 
      'LayoutDashboard', 
      'Main dashboard with overview',
      '{"content": "<div class=\"prose max-w-none\"><h2>Welcome to your Dashboard</h2><p>This is your main dashboard page. You can customize this content through the menu management interface.</p></div>"}'::jsonb
    ),
    (
      NEW.id, 
      'Profile', 
      'profile', 
      1, 
      'content', 
      'User', 
      'Manage your profile settings',
      '{"content": "<div class=\"prose max-w-none\"><h2>User Profile</h2><p>Manage your profile information and settings.</p></div>"}'::jsonb
    ),
    (
      NEW.id, 
      'Settings', 
      'settings', 
      2, 
      'content', 
      'Settings', 
      'Configure your account settings',
      '{"content": "<div class=\"prose max-w-none\"><h2>Account Settings</h2><p>Configure your account preferences and settings.</p></div>"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON public.user_menu_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_menu_items_id_seq TO authenticated;