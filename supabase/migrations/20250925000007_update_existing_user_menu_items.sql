-- Update existing user menu items with default values for new columns
-- This migration ensures existing data is compatible with the updated schema

-- Update existing records with default values
UPDATE public.user_menu_items 
SET 
  user_id = '00000000-0000-0000-0000-000000000000', -- Placeholder, should be updated with real user IDs
  page_type = COALESCE(page_type, 'content'),
  content_data = COALESCE(content_data, '{}'::jsonb),
  updated_at = NOW()
WHERE user_id = '00000000-0000-0000-0000-000000000000' OR user_id IS NULL;

-- For existing items, set a default page_type if not already set
UPDATE public.user_menu_items 
SET page_type = 'content' 
WHERE page_type IS NULL;

-- For existing items, set a default content_data if not already set
UPDATE public.user_menu_items 
SET content_data = '{}'::jsonb 
WHERE content_data IS NULL;

-- Update the default function to include all necessary fields
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
      '{"content": "<div class=\"prose max-w-none\"><h2>Welcome to your Dashboard</h2><p>This is your main dashboard page. You can customize this content through the admin interface.</p></div>"}'::jsonb
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