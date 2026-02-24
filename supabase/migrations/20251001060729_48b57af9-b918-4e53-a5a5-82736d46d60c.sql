-- Add notes field to events table
ALTER TABLE public.events
ADD COLUMN notes TEXT;