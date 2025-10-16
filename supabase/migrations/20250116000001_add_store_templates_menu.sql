-- Add Store Templates menu item to admin menu
INSERT INTO admin_menu_items (title, path, icon, description, sort_order, parent_id)
VALUES (
  'Шаблони XML',
  '/admin/storetemplates',
  'FileCode',
  'Управління шаблонами XML для маркетплейсів',
  9,
  NULL
) ON CONFLICT (path) DO NOTHING;
