-- Add Midtrans subscription ID and schedule tracking to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS midtrans_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_schedule JSONB;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_midtrans_subscription_id 
ON public.subscriptions(midtrans_subscription_id);

-- Add comment
COMMENT ON COLUMN public.subscriptions.midtrans_subscription_id IS 'Midtrans Subscription API subscription ID for recurring payments';
COMMENT ON COLUMN public.subscriptions.next_billing_date IS 'Next scheduled billing date from Midtrans';
COMMENT ON COLUMN public.subscriptions.subscription_schedule IS 'Schedule details from Midtrans Subscription API';