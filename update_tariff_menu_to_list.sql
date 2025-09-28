-- Update existing tariff menu items to use list page type with custom configuration
UPDATE public.user_menu_items 
SET 
  page_type = 'list',
  title = 'Tariff Plans',
  content_data = '{
    "table_config": {
      "columns": [
        {"key": "icon", "label": "", "type": "text"},
        {"key": "name", "label": "Название тарифа", "type": "text", "sortable": true},
        {"key": "new_price", "label": "Цена", "type": "number", "sortable": true},
        {"key": "duration_days", "label": "Термін", "type": "number", "sortable": true},
        {"key": "is_active", "label": "Статус", "type": "badge", "sortable": true},
        {"key": "actions", "label": "Действия", "type": "text"}
      ]
    }
  }'::jsonb
WHERE path = 'tariff';