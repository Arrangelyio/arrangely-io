-- Create table to store linked payment accounts
CREATE TABLE public.linked_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL, -- 'gopay' or 'credit_card'
  account_id TEXT NOT NULL, -- Midtrans account_id from linking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'linked', 'revoked', 'expired'
  account_details JSONB, -- Store additional account info from Midtrans
  linked_at TIMESTAMP WITH TIME ZONE,
  last_charge_at TIMESTAMP WITH TIME ZONE,
  next_charge_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create table to track recurring payment attempts
CREATE TABLE public.recurring_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_account_id UUID NOT NULL REFERENCES public.linked_payment_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'cancelled'
  midtrans_order_id TEXT,
  midtrans_transaction_id TEXT,
  error_message TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.linked_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payment_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for linked_payment_accounts
CREATE POLICY "Users can view their own linked accounts" 
ON public.linked_payment_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked accounts" 
ON public.linked_payment_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all linked accounts" 
ON public.linked_payment_accounts 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- RLS policies for recurring_payment_attempts
CREATE POLICY "Users can view their own payment attempts" 
ON public.recurring_payment_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all payment attempts" 
ON public.recurring_payment_attempts 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_linked_payment_accounts_user_id ON public.linked_payment_accounts(user_id);
CREATE INDEX idx_linked_payment_accounts_status ON public.linked_payment_accounts(status);
CREATE INDEX idx_linked_payment_accounts_next_charge ON public.linked_payment_accounts(next_charge_at) WHERE status = 'linked';
CREATE INDEX idx_recurring_payment_attempts_linked_account ON public.recurring_payment_attempts(linked_account_id);

-- Create trigger for updated_at
CREATE TRIGGER update_linked_payment_accounts_updated_at
    BEFORE UPDATE ON public.linked_payment_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();