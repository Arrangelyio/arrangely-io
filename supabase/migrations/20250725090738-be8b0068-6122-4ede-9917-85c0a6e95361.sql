-- Update subscription plans with configurable library limits
ALTER TABLE public.subscription_plans 
ADD COLUMN library_limit INTEGER DEFAULT 10;

-- Update existing plans with proper library limits
UPDATE public.subscription_plans 
SET library_limit = 10 
WHERE price = 0;

UPDATE public.subscription_plans 
SET library_limit = 50 
WHERE price = 30000;

UPDATE public.subscription_plans 
SET library_limit = 100 
WHERE price = 50000;

-- Insert default subscription plans if they don't exist
INSERT INTO public.subscription_plans (name, price, currency, interval_type, interval_count, library_limit, features, is_active)
VALUES 
  ('Free Trial', 0, 'IDR', 'month', 1, 10, '{"library_songs": 10, "exports": 5, "youtube_imports": 3}', true),
  ('Basic Plan', 30000, 'IDR', 'month', 1, 50, '{"library_songs": 50, "exports": 20, "youtube_imports": 15}', true),
  ('Premium Plan', 50000, 'IDR', 'month', 1, 100, '{"library_songs": 100, "exports": 50, "youtube_imports": 30}', true)
ON CONFLICT (name) DO UPDATE SET
  library_limit = EXCLUDED.library_limit,
  features = EXCLUDED.features;