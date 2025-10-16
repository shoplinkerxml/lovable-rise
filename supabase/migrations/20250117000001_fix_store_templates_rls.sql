-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.store_templates;
DROP POLICY IF EXISTS "Service role can insert templates" ON public.store_templates;
DROP POLICY IF EXISTS "Service role can update templates" ON public.store_templates;
DROP POLICY IF EXISTS "Service role can delete templates" ON public.store_templates;

-- Create new policies with proper admin checks
CREATE POLICY "Anyone can view active templates" ON public.store_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Allow admins to manage templates (checking profiles table)
CREATE POLICY "Admins can insert templates" ON public.store_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update templates" ON public.store_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete templates" ON public.store_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
