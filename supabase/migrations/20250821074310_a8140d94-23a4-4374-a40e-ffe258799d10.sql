-- Add voicing columns to chord_review_queue table
ALTER TABLE public.chord_review_queue 
ADD COLUMN IF NOT EXISTS suggested_guitar_voicing JSONB,
ADD COLUMN IF NOT EXISTS suggested_piano_voicing JSONB;