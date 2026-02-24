-- Check if notifications already exist and add winner notification functionality
CREATE TABLE IF NOT EXISTS public.lottery_winners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  attendee_name text NOT NULL,
  reward_name text NOT NULL,
  reward_type text NOT NULL,
  subscription_plan text,
  won_at timestamp with time zone NOT NULL DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lottery_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own lottery wins" 
ON public.lottery_winners 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage lottery winners" 
ON public.lottery_winners 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lottery_winners_user_id ON public.lottery_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_event_id ON public.lottery_winners(event_id);