-- Add auto_payment settings to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN auto_payment_enabled BOOLEAN DEFAULT true,
ADD COLUMN payment_failed_count INTEGER DEFAULT 0,
ADD COLUMN next_payment_attempt TIMESTAMPTZ;

-- Add expiration tracking fields
ALTER TABLE subscriptions
ADD COLUMN trial_expired BOOLEAN DEFAULT false,
ADD COLUMN last_payment_status TEXT;

-- Create index for expired trial queries
CREATE INDEX idx_subscriptions_trial_expired ON subscriptions(user_id, trial_expired, trial_end) WHERE is_trial = true;