-- Create yearly subscription plans
INSERT INTO public.subscription_plans (name, price, currency, interval_type, interval_count, features, is_active, library_limit, is_production) VALUES
('Yearly Premium', 300000, 'IDR', 'year', 1, '{"ai_tools": true, "pdf_exports": "unlimited", "arrangements": "unlimited", "collaboration": true, "priority_support": true}', true, 50, true),
('Yearly Premium Plan', 500000, 'IDR', 'year', 1, '{"exports": 600, "library_songs": 1000, "youtube_imports": 365}', true, 100, true);