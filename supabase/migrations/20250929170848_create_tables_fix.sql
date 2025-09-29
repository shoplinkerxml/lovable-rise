-- Create tariff tables if they don't exist

-- Create currencies table
CREATE TABLE IF NOT EXISTS public.currencies (
  id SERIAL NOT NULL,
  code CHARACTER VARYING(3) NOT NULL,
  name CHARACTER VARYING(100) NOT NULL,
  rate DECIMAL(10,4) NOT NULL DEFAULT 1.0,
  status BOOLEAN NULL DEFAULT true,
  is_base BOOLEAN NULL DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT currencies_pkey PRIMARY KEY (id),
  CONSTRAINT currencies_code_key UNIQUE (code)
) TABLESPACE pg_default;

-- Create tariffs table
CREATE TABLE IF NOT EXISTS public.tariffs (
  id SERIAL NOT NULL,
  name CHARACTER VARYING(255) NOT NULL,
  description TEXT NULL,
  old_price DECIMAL(10,2) NULL,
  new_price DECIMAL(10,2) NULL,
  currency_id INTEGER NOT NULL DEFAULT 1,
  currency_code CHARACTER VARYING(10) NOT NULL DEFAULT 'USD',
  duration_days INTEGER NULL,
  is_free BOOLEAN NULL DEFAULT false,
  is_lifetime BOOLEAN NULL DEFAULT false,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT tariffs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create tariff_features table
CREATE TABLE IF NOT EXISTS public.tariff_features (
  id SERIAL NOT NULL,
  tariff_id INTEGER NOT NULL,
  feature_name CHARACTER VARYING(255) NOT NULL,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT tariff_features_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create tariff_limits table
CREATE TABLE IF NOT EXISTS public.tariff_limits (
  id SERIAL NOT NULL,
  tariff_id INTEGER NOT NULL,
  limit_name CHARACTER VARYING(255) NOT NULL,
  value INTEGER NOT NULL,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT tariff_limits_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Add foreign key constraints
ALTER TABLE public.tariffs 
ADD CONSTRAINT tariffs_currency_fkey 
FOREIGN KEY (currency_id) REFERENCES currencies (id);

ALTER TABLE public.tariff_features 
ADD CONSTRAINT tariff_features_tariff_id_fkey 
FOREIGN KEY (tariff_id) REFERENCES tariffs (id) ON DELETE CASCADE;

ALTER TABLE public.tariff_limits 
ADD CONSTRAINT tariff_limits_tariff_id_fkey 
FOREIGN KEY (tariff_id) REFERENCES tariffs (id) ON DELETE CASCADE;

-- Insert default currencies if not exist
INSERT INTO public.currencies (code, name, rate, status, is_base) VALUES
  ('USD', 'US Dollar', 1.0, true, true),
  ('EUR', 'Euro', 0.85, true, false),
  ('UAH', 'Ukrainian Hryvnia', 27.0, true, false)
ON CONFLICT (code) DO NOTHING;

-- Grant permissions
GRANT ALL ON public.currencies TO authenticated;
GRANT ALL ON public.tariffs TO authenticated;
GRANT ALL ON public.tariff_features TO authenticated;
GRANT ALL ON public.tariff_limits TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.currencies_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tariffs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tariff_features_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tariff_limits_id_seq TO authenticated;