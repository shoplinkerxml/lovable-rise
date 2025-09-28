-- Create user-specific menu items table for user menu management
CREATE TABLE public.user_menu_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL, -- REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_id INTEGER, -- REFERENCES public.user_menu_items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  page_type TEXT DEFAULT 'content' CHECK (page_type IN ('content', 'form', 'dashboard', 'list', 'custom')),
  content_data JSONB DEFAULT '{}'::jsonb,
  template_name TEXT,
  meta_data JSONB DEFAULT '{}'::jsonb,
  icon_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, path)
);

-- Add indexes for performance
CREATE INDEX idx_user_menu_items_user_id ON public.user_menu_items(user_id);
CREATE INDEX idx_user_menu_items_parent_id ON public.user_menu_items(parent_id);
CREATE INDEX idx_user_menu_items_order ON public.user_menu_items(user_id, parent_id, order_index);

-- Enable RLS on the table
ALTER TABLE public.user_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own menu items
CREATE POLICY "Users can manage their own menu items" ON public.user_menu_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all user menu items (for support/management)
-- Skip this policy as profiles table doesn't exist yet
-- CREATE POLICY "Admins can view all user menu items" ON public.user_menu_items
--   FOR SELECT TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles 
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION public.update_user_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_menu_items_updated_at_trigger
  BEFORE UPDATE ON public.user_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_menu_items_updated_at();

-- Skip updating profiles table as it doesn't exist yet
-- Update profiles table to ensure default role is 'user' for new registrations
-- ALTER TABLE public.profiles 
-- ALTER COLUMN role SET DEFAULT 'user';

-- Insert default menu items for new users
CREATE OR REPLACE FUNCTION public.create_default_user_menu()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create default menu for users with 'user' role
  IF NEW.role = 'user' THEN
    INSERT INTO public.user_menu_items (user_id, title, path, order_index, page_type, icon_name, description, content_data) VALUES
    (NEW.id, 'Dashboard', 'dashboard', 0, 'dashboard', 'LayoutDashboard', 'Main dashboard with overview', '{}'::jsonb),
    (NEW.id, 'Profile', 'profile', 1, 'content', 'User', 'Manage your profile settings', '{}'::jsonb),
    (NEW.id, 'My Menu', 'my-menu', 2, 'content', 'Menu', 'Manage your personal menu items', '{}'::jsonb),
    (NEW.id, 'Тарифні плани', 'tariff', 3, 'list', 'CreditCard', 'Manage your tariff and billing information', 
     '{"table_config": {"columns": [{"key": "icon", "label": "", "type": "text"}, {"key": "name", "label": "Назва тарифу", "type": "text", "sortable": true}, {"key": "new_price", "label": "Ціна", "type": "number", "sortable": true}, {"key": "duration_days", "label": "Термін", "type": "number", "sortable": true}, {"key": "is_active", "label": "Статус", "type": "badge", "sortable": true}, {"key": "actions", "label": "Дії", "type": "text"}]}}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Skip trigger creation as profiles table doesn't exist yet
-- Trigger to create default menu for new users
-- CREATE TRIGGER create_default_user_menu_trigger
--   AFTER INSERT ON public.profiles
--   FOR EACH ROW
--   EXECUTE FUNCTION public.create_default_user_menu();

-- Grant necessary permissions
GRANT ALL ON public.user_menu_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_menu_items_id_seq TO authenticated;