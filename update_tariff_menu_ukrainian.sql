-- Update existing tariff menu items to use Ukrainian column headers
UPDATE public.user_menu_items 
SET 
  title = 'Тарифні плани',
  content_data = '{
    "table_config": {
      "columns": [
        {"key": "icon", "label": "", "type": "text"},
        {"key": "name", "label": "Назва тарифу", "type": "text", "sortable": true},
        {"key": "new_price", "label": "Ціна", "type": "number", "sortable": true},
        {"key": "duration_days", "label": "Термін", "type": "number", "sortable": true},
        {"key": "is_active", "label": "Статус", "type": "badge", "sortable": true},
        {"key": "actions", "label": "Дії", "type": "text"}
      ]
    },
    "data": []
  }'::jsonb
WHERE path = 'tariff';