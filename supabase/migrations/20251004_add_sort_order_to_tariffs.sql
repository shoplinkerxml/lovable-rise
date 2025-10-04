-- Add sort_order column to tariffs table
ALTER TABLE public.tariffs
ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Update existing records to ensure consistent ordering
UPDATE public.tariffs
SET sort_order = id
WHERE sort_order = 0;

-- Optional: create an index to speed up ordering queries
CREATE INDEX IF NOT EXISTS idx_tariffs_sort_order
ON public.tariffs (sort_order);

-- Comment for clarity
COMMENT ON COLUMN public.tariffs.sort_order IS 'Определяет порядок вывода тарифов на странице пользователя';
