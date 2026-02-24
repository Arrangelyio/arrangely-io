-- Add stage_seating_image_url column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS stage_seating_image_url TEXT;