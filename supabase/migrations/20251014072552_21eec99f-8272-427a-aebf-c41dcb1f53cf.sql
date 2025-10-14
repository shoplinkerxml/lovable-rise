-- Add visible and popular columns to tariffs table
ALTER TABLE public.tariffs 
ADD COLUMN visible boolean NOT NULL DEFAULT true,
ADD COLUMN popular boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tariffs.visible IS 'Determines if tariff is visible in user cabinet';
COMMENT ON COLUMN public.tariffs.popular IS 'Marks tariff as popular with a badge';