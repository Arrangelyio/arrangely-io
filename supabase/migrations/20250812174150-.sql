-- Create wallet_creator table
CREATE TABLE public.wallet_creator (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL UNIQUE,
  available_amount INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.wallet_creator ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators can view their own wallet" 
ON public.wallet_creator 
FOR SELECT 
USING (creator_id = auth.uid());

CREATE POLICY "Admins can manage all wallets" 
ON public.wallet_creator 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Create function to get or create wallet
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(creator_id_param UUID)
RETURNS public.wallet_creator
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  wallet_record public.wallet_creator;
BEGIN
  -- Try to get existing wallet
  SELECT * INTO wallet_record
  FROM public.wallet_creator
  WHERE creator_id = creator_id_param;
  
  -- Create wallet if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.wallet_creator (creator_id, is_production)
    VALUES (creator_id_param, public.get_current_environment())
    RETURNING * INTO wallet_record;
  END IF;
  
  RETURN wallet_record;
END;
$$;

-- Function to check if creator can make withdrawal
CREATE OR REPLACE FUNCTION public.can_create_withdrawal(creator_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  last_withdrawal_status TEXT;
BEGIN
  -- Get the status of the most recent withdrawal request
  SELECT status INTO last_withdrawal_status
  FROM public.creator_withdrawal_requests
  WHERE creator_id = creator_id_param
  AND is_production = public.get_current_environment()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Allow withdrawal if no previous requests or last one was completed
  RETURN (last_withdrawal_status IS NULL OR last_withdrawal_status = 'completed');
END;
$$;

-- Function to get previous payment method details
CREATE OR REPLACE FUNCTION public.get_previous_payment_details(creator_id_param UUID)
RETURNS TABLE(
  method TEXT,
  payment_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cwr.method,
    cwr.payment_details
  FROM public.creator_withdrawal_requests cwr
  WHERE cwr.creator_id = creator_id_param
  AND cwr.is_production = public.get_current_environment()
  AND cwr.status = 'completed'
  ORDER BY cwr.created_at DESC
  LIMIT 1;
END;
$$;

-- Trigger function to update wallet on creator_benefits insert
CREATE OR REPLACE FUNCTION public.update_wallet_on_benefit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  wallet_record public.wallet_creator;
BEGIN
  -- Get or create wallet for this creator
  wallet_record := public.get_or_create_wallet(NEW.creator_id);
  
  -- Update wallet amounts
  UPDATE public.wallet_creator
  SET 
    available_amount = available_amount + NEW.amount,
    total_earned = total_earned + NEW.amount,
    updated_at = now()
  WHERE creator_id = NEW.creator_id;
  
  RETURN NEW;
END;
$$;

-- Trigger function to update wallet on withdrawal request
CREATE OR REPLACE FUNCTION public.update_wallet_on_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  wallet_record public.wallet_creator;
  current_available INTEGER;
BEGIN
  -- Check if creator can make withdrawal
  IF NOT public.can_create_withdrawal(NEW.creator_id) THEN
    RAISE EXCEPTION 'Cannot create withdrawal request. Previous request is still pending or rejected.'
    USING ERRCODE = 'P0001';
  END IF;
  
  -- Get current available amount
  SELECT available_amount INTO current_available
  FROM public.wallet_creator
  WHERE creator_id = NEW.creator_id;
  
  -- Check if sufficient funds
  IF current_available < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient funds. Available: %, Requested: %', current_available, NEW.amount
    USING ERRCODE = 'P0001';
  END IF;
  
  -- Decrease available amount
  UPDATE public.wallet_creator
  SET 
    available_amount = available_amount - NEW.amount,
    updated_at = now()
  WHERE creator_id = NEW.creator_id;
  
  RETURN NEW;
END;
$$;

-- Trigger function to handle withdrawal status changes
CREATE OR REPLACE FUNCTION public.handle_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- If withdrawal was rejected, revert the amount back to wallet
  IF OLD.status != 'rejected' AND NEW.status = 'rejected' THEN
    UPDATE public.wallet_creator
    SET 
      available_amount = available_amount + NEW.amount,
      updated_at = now()
    WHERE creator_id = NEW.creator_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER update_wallet_on_benefit_trigger
  AFTER INSERT ON public.creator_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_on_benefit();

CREATE TRIGGER update_wallet_on_withdrawal_trigger
  BEFORE INSERT ON public.creator_withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_on_withdrawal();

CREATE TRIGGER handle_withdrawal_status_change_trigger
  AFTER UPDATE ON public.creator_withdrawal_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_withdrawal_status_change();

-- Create trigger for updated_at
CREATE TRIGGER update_wallet_creator_updated_at
  BEFORE UPDATE ON public.wallet_creator
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();