-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in IDR cents (e.g., 4900000 for Rp49.000)
  currency TEXT DEFAULT 'IDR',
  interval_type TEXT NOT NULL DEFAULT 'month', -- month, year
  interval_count INTEGER DEFAULT 1,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id),
  midtrans_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payments table for tracking all payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id),
  midtrans_order_id TEXT UNIQUE,
  midtrans_transaction_id TEXT,
  amount INTEGER NOT NULL, -- in IDR cents
  currency TEXT DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, cancelled
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create discount codes table
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed_amount
  discount_value INTEGER NOT NULL, -- percentage (e.g., 10 for 10%) or amount in cents
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Subscription plans are publicly viewable" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage payments" 
ON public.payments 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- RLS Policies for discount_codes
CREATE POLICY "Active discount codes are publicly viewable" 
ON public.discount_codes 
FOR SELECT 
USING (is_active = true AND valid_until > now());

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, price, features) VALUES 
('Free', 0, '{"arrangements": "limited", "pdf_exports": 3, "ai_tools": false, "priority_support": false}'),
('Premium', 4900000, '{"arrangements": "unlimited", "pdf_exports": "unlimited", "ai_tools": true, "priority_support": true, "collaboration": true}');

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();