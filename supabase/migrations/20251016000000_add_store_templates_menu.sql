-- Добавляем пункт меню "Шаблоны магазинов" в раздел настроек админки

INSERT INTO menu_items (title, path, icon_name, parent_id, order_index, section_type, is_active)
VALUES 
  ('Шаблоны магазинов', '/store-templates', 'store', 
   (SELECT id FROM menu_items WHERE path = '/settings' AND parent_id IS NULL LIMIT 1), 
   40, 'settings', true)
ON CONFLICT DO NOTHING;
