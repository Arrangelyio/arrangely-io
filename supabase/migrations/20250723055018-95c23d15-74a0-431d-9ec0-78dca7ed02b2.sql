-- Add sequencer_id field to payments table to track sequencer purchases
ALTER TABLE public.payments 
ADD COLUMN sequencer_id UUID REFERENCES public.songs(id);

-- Add index for better performance
CREATE INDEX idx_payments_sequencer_id ON public.payments(sequencer_id);
CREATE INDEX idx_payments_user_sequencer ON public.payments(user_id, sequencer_id);