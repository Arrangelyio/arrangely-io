-- Update subscription plans with new pricing
UPDATE public.subscription_plans 
SET 
  price = 25000,
  updated_at = now()
WHERE name = 'Monthly Premium' AND interval_type = 'month';

UPDATE public.subscription_plans 
SET 
  price = 249000,
  name = 'Yearly',
  features = '{"priority_support": true, "pdf_exports": "unlimited", "arrangements": "unlimited", "collaboration": true}',
  updated_at = now()
WHERE name = 'Yearly Premium' AND interval_type = 'year';

UPDATE public.subscription_plans 
SET 
  price = 299000,
  name = 'Yearly Plan', 
  features = '{"priority_support": true, "pdf_exports": "unlimited", "arrangements": "unlimited", "collaboration": true}',
  updated_at = now()
WHERE name = 'Yearly Premium Plan' AND interval_type = 'year';

-- Update monthly premium plan name and features (remove AI tools)
UPDATE public.subscription_plans 
SET 
  name = 'Monthly',
  features = '{"priority_support": true, "pdf_exports": "unlimited", "arrangements": "unlimited", "collaboration": true}',
  updated_at = now()
WHERE name = 'Monthly Premium' AND interval_type = 'month';