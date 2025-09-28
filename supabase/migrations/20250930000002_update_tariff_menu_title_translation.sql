-- Update tariff menu items to use translation key instead of hardcoded string
UPDATE public.user_menu_items 
SET 
  title = 'menu_pricing'
WHERE title = 'Тарифні плани' AND path = 'tariff';