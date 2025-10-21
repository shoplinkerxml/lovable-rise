-- Add order_index column to limit_templates table
ALTER TABLE public.limit_templates 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX IF NOT EXISTS idx_limit_templates_order_index 
ON public.limit_templates(order_index);

-- Set initial order based on current id order
UPDATE public.limit_templates 
SET order_index = subquery.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 as row_num 
  FROM public.limit_templates
) AS subquery 
WHERE limit_templates.id = subquery.id;
