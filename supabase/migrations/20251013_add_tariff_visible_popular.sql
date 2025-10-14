-- Add new visibility and popularity flags to tariffs
ALTER TABLE public.tariffs
  ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS popular boolean DEFAULT false;

-- Ensure non-null defaults for consistency
UPDATE public.tariffs SET visible = COALESCE(visible, true);
UPDATE public.tariffs SET popular = COALESCE(popular, false);

-- Optional: If you want only visible tariffs selectable by authenticated users
-- (keep existing is_active filter too)
-- DROP POLICY IF EXISTS "tariffs_select_authenticated" ON public.tariffs;
-- CREATE POLICY "tariffs_select_authenticated" ON public.tariffs
--   FOR SELECT TO authenticated
--   USING (is_active = true AND visible = true);

NOTIFY pgrst, 'reload schema';
