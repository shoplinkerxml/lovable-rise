-- Fix user_menu_items table structure to match the application requirements
-- This migration adds missing columns and constraints to support the full menu functionality

-- Add missing columns to user_menu_items table
ALTER TABLE public.user_menu_items 
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
ADD COLUMN IF NOT EXISTS page_type TEXT DEFAULT 'content' CHECK (page_type IN ('content', 'form', 'dashboard', 'list', 'custom')),
ADD COLUMN IF NOT EXISTS content_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS icon_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_menu_items_user_id ON public.user_menu_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_menu_items_order ON public.user_menu_items(user_id, parent_id, order_index);

-- Add foreign key constraint for user_id
-- Note: This will need to be updated when the profiles table is properly set up
-- ALTER TABLE public.user_menu_items 
-- ADD CONSTRAINT fk_user_menu_items_user_id 
-- FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add RLS policies
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

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_user_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_menu_items_updated_at_trigger ON public.user_menu_items;
CREATE TRIGGER update_user_menu_items_updated_at_trigger
  BEFORE UPDATE ON public.user_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_menu_items_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.user_menu_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_menu_items_id_seq TO authenticated;