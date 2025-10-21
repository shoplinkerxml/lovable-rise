-- Add max_shop limit template if it doesn't exist
INSERT INTO public.limit_templates (code, name, description, order_index)
VALUES (
  'max_shop',
  'Кількість магазинів',
  'Максимальна кількість магазинів, які користувач може створити',
  10
)
ON CONFLICT (code) DO NOTHING;

-- Update existing tariff limits to use the new template_id
-- This assumes that limits with "магазин" in the name should reference max_shop template
UPDATE public.tariff_limits
SET template_id = (SELECT id FROM public.limit_templates WHERE code = 'max_shop')
WHERE (limit_name ILIKE '%магазин%' OR limit_name ILIKE '%shop%')
  AND template_id IS NULL;
