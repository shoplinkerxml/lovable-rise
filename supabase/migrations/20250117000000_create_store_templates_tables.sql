-- Create store_templates table for admin-created XML templates
CREATE TABLE IF NOT EXISTS public.store_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  marketplace TEXT,
  xml_structure JSONB NOT NULL,
  mapping_rules JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_stores table for user instances of templates
CREATE TABLE IF NOT EXISTS public.user_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.store_templates(id) ON DELETE SET NULL,
  store_name TEXT NOT NULL,
  custom_mapping JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_templates_active ON public.store_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_store_templates_marketplace ON public.store_templates(marketplace);
CREATE INDEX IF NOT EXISTS idx_user_stores_user_id ON public.user_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stores_template_id ON public.user_stores(template_id);

-- Enable RLS
ALTER TABLE public.store_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_templates (admin-only for write, all authenticated for read)
CREATE POLICY "Anyone can view active templates" ON public.store_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can insert templates" ON public.store_templates
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can update templates" ON public.store_templates
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Service role can delete templates" ON public.store_templates
  FOR DELETE TO authenticated
  USING (true);

-- RLS Policies for user_stores
CREATE POLICY "Users can view their own stores" ON public.user_stores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own stores" ON public.user_stores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own stores" ON public.user_stores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own stores" ON public.user_stores
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.store_templates TO authenticated;
GRANT ALL ON public.user_stores TO authenticated;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_templates_updated_at
  BEFORE UPDATE ON public.store_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stores_updated_at
  BEFORE UPDATE ON public.user_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
