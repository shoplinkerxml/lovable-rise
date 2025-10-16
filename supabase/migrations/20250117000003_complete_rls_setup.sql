-- Complete RLS setup for store_templates
-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.store_templates;
DROP POLICY IF EXISTS "Service role can insert templates" ON public.store_templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON public.store_templates;
DROP POLICY IF EXISTS "Authenticated can update templates" ON public.store_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.store_templates;
DROP POLICY IF EXISTS "Service role can delete templates" ON public.store_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.store_templates;

-- View policy - all authenticated users can view active templates
CREATE POLICY "Anyone can view active templates" ON public.store_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Insert policy - only admins can create templates
CREATE POLICY "Admins can insert templates" ON public.store_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update policy - only admins can update templates
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

-- Delete policy - only admins can delete templates
CREATE POLICY "Admins can delete templates" ON public.store_templates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
