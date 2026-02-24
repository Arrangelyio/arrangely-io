-- Create table for tracking withdrawal requests
CREATE TABLE public.creator_withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  payment_details JSONB NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  net_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE NULL,
  processed_by UUID NULL,
  admin_notes TEXT NULL,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators can view their own withdrawal requests" 
ON public.creator_withdrawal_requests 
FOR SELECT 
USING (creator_id = auth.uid());

CREATE POLICY "Creators can create their own withdrawal requests" 
ON public.creator_withdrawal_requests 
FOR INSERT 
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Admins can manage all withdrawal requests" 
ON public.creator_withdrawal_requests 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add trigger for updated_at
CREATE TRIGGER update_creator_withdrawal_requests_updated_at
BEFORE UPDATE ON public.creator_withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE creator_withdrawal_requests
ADD CONSTRAINT creator_withdrawal_requests_creator_id_fkey
FOREIGN KEY (creator_id)
REFERENCES profiles (user_id);
