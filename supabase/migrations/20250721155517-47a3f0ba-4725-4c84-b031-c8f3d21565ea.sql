-- Update subscription plans for new pricing scheme
UPDATE subscription_plans 
SET price = 30000, name = 'Monthly Premium' 
WHERE name = 'Premium';

-- Add yearly plan
INSERT INTO subscription_plans (id, name, price, currency, interval_type, interval_count, is_active, features) 
VALUES (
  gen_random_uuid(),
  'Yearly Premium',
  250000,
  'IDR',
  'year',
  1,
  true,
  '{
    "ai_tools": true,
    "arrangements": "unlimited",
    "collaboration": true,
    "pdf_exports": "unlimited",
    "priority_support": true,
    "yearly_discount": true
  }'::jsonb
);

-- Add trial tracking columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN trial_start TIMESTAMPTZ,
ADD COLUMN trial_end TIMESTAMPTZ,
ADD COLUMN is_trial BOOLEAN DEFAULT false,
ADD COLUMN retry_count INTEGER DEFAULT 0,
ADD COLUMN last_retry_at TIMESTAMPTZ;

-- Create notifications table for payment reminders
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trial_reminder', 'payment_reminder', 'payment_failed', 'subscription_canceled', 'payment_success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

-- Create policy for service role to manage notifications
CREATE POLICY "Service role can manage notifications" ON notifications
FOR ALL USING (current_setting('role') = 'service_role');

-- Create cancellation reasons table
CREATE TABLE subscription_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  reason_category TEXT CHECK (reason_category IN ('too_expensive', 'not_using', 'missing_features', 'technical_issues', 'other')),
  feedback TEXT,
  canceled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  offered_discount BOOLEAN DEFAULT false,
  accepted_discount BOOLEAN DEFAULT false
);

-- Enable RLS on cancellations
ALTER TABLE subscription_cancellations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own cancellations
CREATE POLICY "Users can view their own cancellations" ON subscription_cancellations
FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own cancellations
CREATE POLICY "Users can create their own cancellations" ON subscription_cancellations
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger to update subscription updated_at
CREATE TRIGGER update_subscription_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscription_updated_at();