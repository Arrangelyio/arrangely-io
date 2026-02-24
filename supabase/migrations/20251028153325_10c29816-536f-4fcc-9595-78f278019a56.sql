-- Add Midtrans subscription tracking columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS midtrans_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS midtrans_subscription_token TEXT,
ADD COLUMN IF NOT EXISTS midtrans_subscription_status TEXT,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_interval INTEGER DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_midtrans_id 
ON subscriptions(midtrans_subscription_id) 
WHERE midtrans_subscription_id IS NOT NULL;