-- Insert sample tariffs data
INSERT INTO public.tariffs (name, description, old_price, new_price, currency, duration_days, is_free, is_lifetime, is_active) VALUES
  ('Basic Plan', 'Perfect for individuals getting started', 19.99, 14.99, 1, 30, false, false, true),
  ('Pro Plan', 'Ideal for professionals and small teams', 49.99, 39.99, 1, 30, false, false, true),
  ('Enterprise Plan', 'For large organizations with advanced needs', 99.99, 79.99, 1, 30, false, false, true);

-- Insert sample features for each tariff
INSERT INTO public.tariff_features (tariff_id, feature_name, is_active) VALUES
  -- Basic Plan features
  (1, 'Up to 5 projects', true),
  (1, 'Basic analytics', true),
  (1, 'Email support', true),
  (1, 'API access', false),
  (1, 'Custom domain', false),
  (1, 'Team collaboration', false),
  
  -- Pro Plan features
  (2, 'Unlimited projects', true),
  (2, 'Advanced analytics', true),
  (2, 'Priority email support', true),
  (2, 'API access', true),
  (2, 'Custom domain', true),
  (2, 'Team collaboration', true),
  (2, 'Daily backups', false),
  
  -- Enterprise Plan features
  (3, 'Unlimited projects', true),
  (3, 'Advanced analytics', true),
  (3, '24/7 phone support', true),
  (3, 'API access', true),
  (3, 'Custom domain', true),
  (3, 'Team collaboration', true),
  (3, 'Daily backups', true),
  (3, 'SLA guarantee', true);

-- Insert sample limits for each tariff
INSERT INTO public.tariff_limits (tariff_id, limit_name, value, is_active) VALUES
  -- Basic Plan limits
  (1, 'Storage (GB)', 10, true),
  (1, 'Team members', 1, true),
  (1, 'API requests per day', 1000, true),
  
  -- Pro Plan limits
  (2, 'Storage (GB)', 100, true),
  (2, 'Team members', 10, true),
  (2, 'API requests per day', 10000, true),
  
  -- Enterprise Plan limits
  (3, 'Storage (GB)', 1000, true),
  (3, 'Team members', 100, true),
  (3, 'API requests per day', 100000, true);