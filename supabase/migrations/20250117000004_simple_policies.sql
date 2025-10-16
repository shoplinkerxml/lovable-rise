-- Simple policy for development - any authenticated user can manage templates
DROP POLICY IF EXISTS "Admins can update templates" ON public.store_templates;
DROP POLICY IF EXISTS "Authenticated can update templates" ON public.store_templates;

CREATE POLICY "Allow authenticated update templates" ON public.store_templates
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can insert templates" ON public.store_templates;
CREATE POLICY "Allow authenticated insert templates" ON public.store_templates
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete templates" ON public.store_templates;
CREATE POLICY "Allow authenticated delete templates" ON public.store_templates
  FOR DELETE TO authenticated
  USING (true);
