-- Update menu items to use description translation keys
UPDATE public.user_menu_items 
SET 
  description = 'currency_management_description'
WHERE path = 'currency';

UPDATE public.user_menu_items 
SET 
  description = 'tariff_features_and_limits'
WHERE path = 'tariff-features';