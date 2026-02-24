-- Add use_core_api field to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS use_core_api BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.events.use_core_api IS 'If true, uses Core API payment flow. If false, uses Snap Midtrans directly.';