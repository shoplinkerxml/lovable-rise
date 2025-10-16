-- Allow only admins to update templates
DROP POLICY IF EXISTS "Authenticated can update templates" ON public.store_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.store_templates;

CREATE POLICY "Admins can update templates" ON public.store_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
