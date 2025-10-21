-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tariff_id INTEGER NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITHOUT TIME ZONE NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tariff_id ON public.user_subscriptions(tariff_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active ON public.user_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON public.user_subscriptions(end_date);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage subscriptions" ON public.user_subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.user_subscriptions_id_seq TO authenticated;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON public.user_subscriptions 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to explain the table
COMMENT ON TABLE public.user_subscriptions IS 'Stores user subscription information linking users to their active tariff plans';
COMMENT ON COLUMN public.user_subscriptions.user_id IS 'Reference to the user (auth.users)';
COMMENT ON COLUMN public.user_subscriptions.tariff_id IS 'Reference to the subscribed tariff plan';
COMMENT ON COLUMN public.user_subscriptions.start_date IS 'When the subscription started';
COMMENT ON COLUMN public.user_subscriptions.end_date IS 'When the subscription ends (NULL for lifetime plans)';
COMMENT ON COLUMN public.user_subscriptions.is_active IS 'Whether the subscription is currently active';
