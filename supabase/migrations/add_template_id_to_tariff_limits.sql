-- Add template_id column to tariff_limits table to reference limit_templates
ALTER TABLE public.tariff_limits 
ADD COLUMN IF NOT EXISTS template_id INTEGER NULL;

-- Add foreign key constraint
ALTER TABLE public.tariff_limits 
ADD CONSTRAINT fk_tariff_limits_template 
FOREIGN KEY (template_id) 
REFERENCES public.limit_templates(id)
ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tariff_limits_template_id 
ON public.tariff_limits(template_id);

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.tariff_limits.template_id IS 'Reference to limit_templates table for standardized limit definitions';
