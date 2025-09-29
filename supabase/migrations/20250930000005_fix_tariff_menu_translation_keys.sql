-- Fix tariff menu items to use translation keys instead of hardcoded Ukrainian text
-- This fixes the brackets issue where Ukrainian text appears as [Тарифні плани] and [Управління тарифними планами користувачів]

-- Update tariff menu items to use translation keys for column labels
UPDATE public.user_menu_items 
SET 
  title = 'menu_pricing',
  description = 'tariff_plans_description',
  content_data = '{
    "table_config": {
      "columns": [
        {"key": "icon", "label": "tariff_icon", "type": "text"},
        {"key": "name", "label": "tariff_name", "type": "text", "sortable": true},
        {"key": "new_price", "label": "tariff_price", "type": "number", "sortable": true},
        {"key": "duration_days", "label": "tariff_term", "type": "number", "sortable": true},
        {"key": "is_active", "label": "tariff_status", "type": "badge", "sortable": true},
        {"key": "actions", "label": "tariff_actions", "type": "text"}
      ]
    }
  }'::jsonb
WHERE path = 'tariff';

-- Update tariff-features menu items if they exist
UPDATE public.user_menu_items 
SET 
  title = 'tariff_features_and_limits',
  description = 'manage_features_and_limits_for_tariff_plans'
WHERE path = 'tariff-features';

-- Ensure title uses translation key for all tariff-related items
UPDATE public.user_menu_items 
SET title = 'menu_pricing'
WHERE title = 'Тарифні плани' AND path = 'tariff';

-- Update any hardcoded descriptions to use translation keys
UPDATE public.user_menu_items 
SET description = 'tariff_plans_description'
WHERE description = 'Управління тарифними планами користувачів' AND path = 'tariff';