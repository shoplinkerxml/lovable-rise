-- Create currencies table first as it's referenced by tariffs
CREATE TABLE public.currencies (
  id SERIAL PRIMARY KEY,
  code CHARACTER VARYING(10) NOT NULL UNIQUE,
  name CHARACTER VARYING(255) NOT NULL,
  rate NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
  status BOOLEAN DEFAULT true,
  is_base BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
) TABLESPACE pg_default;

-- Create tariffs table
CREATE TABLE public.tariffs (
  id SERIAL NOT NULL,
  name CHARACTER VARYING(255) NOT NULL,
  description TEXT,
  old_price NUMERIC(12, 2) NULL,
  new_price NUMERIC(12, 2) NULL,
  currency INTEGER NOT NULL,
  duration_days INTEGER NULL,
  is_free BOOLEAN NULL DEFAULT false,
  is_lifetime BOOLEAN NULL DEFAULT false,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT tariffs_pkey PRIMARY KEY (id),
  CONSTRAINT tariffs_currency_fkey FOREIGN KEY (currency) REFERENCES currencies (id)
) TABLESPACE pg_default;

-- Create tariff_features table
CREATE TABLE public.tariff_features (
  id SERIAL NOT NULL,
  tariff_id INTEGER NOT NULL,
  feature_name CHARACTER VARYING(255) NOT NULL,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT tariff_features_pkey PRIMARY KEY (id),
  CONSTRAINT tariff_features_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES tariffs (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create tariff_limits table
CREATE TABLE public.tariff_limits (
  id SERIAL NOT NULL,
  tariff_id INTEGER NOT NULL,
  limit_name CHARACTER VARYING(255) NOT NULL,
  value INTEGER NOT NULL,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT tariff_limits_pkey PRIMARY KEY (id),
  CONSTRAINT tariff_limits_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES tariffs (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX idx_tariffs_currency ON tariffs(currency);
CREATE INDEX idx_tariffs_is_active ON tariffs(is_active);
CREATE INDEX idx_tariff_features_tariff_id ON tariff_features(tariff_id);
CREATE INDEX idx_tariff_features_is_active ON tariff_features(is_active);
CREATE INDEX idx_tariff_limits_tariff_id ON tariff_limits(tariff_id);
CREATE INDEX idx_tariff_limits_is_active ON tariff_limits(is_active);

-- Insert some default currencies
INSERT INTO public.currencies (code, name, rate, is_base) VALUES 
  ('USD', 'US Dollar', 1.0, true),
  ('EUR', 'Euro', 0.85, false),
  ('GBP', 'British Pound', 0.75, false);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for currencies
CREATE POLICY "Admins can manage currencies" ON public.currencies
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view active currencies" ON public.currencies
  FOR SELECT TO authenticated
  USING (status = true);

-- RLS Policies for tariffs (admin can manage, users can view active tariffs)
CREATE POLICY "Admins can manage tariffs" ON public.tariffs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view active tariffs" ON public.tariffs
  FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS Policies for tariff_features
CREATE POLICY "Admins can manage tariff features" ON public.tariff_features
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view active tariff features" ON public.tariff_features
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tariffs t
      WHERE t.id = tariff_id AND t.is_active = true
    ) AND is_active = true
  );

-- RLS Policies for tariff_limits
CREATE POLICY "Admins can manage tariff limits" ON public.tariff_limits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view active tariff limits" ON public.tariff_limits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tariffs t
      WHERE t.id = tariff_id AND t.is_active = true
    ) AND is_active = true
  );

-- Grant permissions
GRANT ALL ON public.currencies TO authenticated;
GRANT ALL ON public.tariffs TO authenticated;
GRANT ALL ON public.tariff_features TO authenticated;
GRANT ALL ON public.tariff_limits TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.currencies_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tariffs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tariff_features_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tariff_limits_id_seq TO authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_currencies_updated_at 
  BEFORE UPDATE ON public.currencies 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tariffs_updated_at 
  BEFORE UPDATE ON public.tariffs 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tariff_features_updated_at 
  BEFORE UPDATE ON public.tariff_features 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tariff_limits_updated_at 
  BEFORE UPDATE ON public.tariff_limits 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default currencies
INSERT INTO public.currencies (code, name, rate, status, is_base) VALUES
  ('USD', 'US Dollar', 1.0, true, true),
  ('EUR', 'Euro', 0.85, true, false),
  ('UAH', 'Ukrainian Hryvnia', 27.0, true, false);