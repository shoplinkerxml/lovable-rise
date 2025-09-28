-- Create user_menu_items table
CREATE TABLE public.user_menu_items (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title CHARACTER VARYING(255) NOT NULL,
  path CHARACTER VARYING(255) NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  page_type CHARACTER VARYING(50) DEFAULT 'content',
  content_data JSONB,
  template_name CHARACTER VARYING(255),
  meta_data JSONB,
  icon_name CHARACTER VARYING(255),
  section_type CHARACTER VARYING(50),
  has_separator BOOLEAN DEFAULT false,
  description TEXT,
  badge_text CHARACTER VARYING(50),
  badge_color CHARACTER VARYING(50),
  parent_id INTEGER REFERENCES public.user_menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX idx_user_menu_items_user_id ON public.user_menu_items(user_id);
CREATE INDEX idx_user_menu_items_path ON public.user_menu_items(path);
CREATE INDEX idx_user_menu_items_parent_id ON public.user_menu_items(parent_id);
CREATE INDEX idx_user_menu_items_order_index ON public.user_menu_items(order_index);

-- Enable RLS
ALTER TABLE public.user_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own menu items" ON public.user_menu_items
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own menu items" ON public.user_menu_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own menu items" ON public.user_menu_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own menu items" ON public.user_menu_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Function to create default menu for new users
CREATE OR REPLACE FUNCTION public.create_default_user_menu()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if menu items already exist for this user
  IF NOT EXISTS (SELECT 1 FROM public.user_menu_items WHERE user_id = NEW.id) THEN
    -- Insert default menu items for new user
    INSERT INTO public.user_menu_items (user_id, title, path, order_index, page_type, icon_name, description, content_data) VALUES
    (NEW.id, 'Dashboard', 'dashboard', 0, 'dashboard', 'LayoutDashboard', 'Main dashboard with overview', '{}'::jsonb),
    (NEW.id, 'Profile', 'profile', 1, 'content', 'User', 'Manage your profile settings', '{}'::jsonb),
    (NEW.id, 'My Menu', 'my-menu', 2, 'content', 'Menu', 'Manage your personal menu items', '{}'::jsonb),
    (NEW.id, 'menu_pricing', 'tariff', 3, 'list', 'CreditCard', 'Manage your tariff and billing information', 
     '{"table_config": {"columns": [{"key": "icon", "label": "tariff_icon", "type": "text"}, {"key": "name", "label": "tariff_name", "type": "text", "sortable": true}, {"key": "new_price", "label": "tariff_price", "type": "number", "sortable": true}, {"key": "duration_days", "label": "tariff_term", "type": "number", "sortable": true}, {"key": "is_active", "label": "tariff_status", "type": "badge", "sortable": true}, {"key": "actions", "label": "tariff_actions", "type": "text"}]}}'::jsonb);
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