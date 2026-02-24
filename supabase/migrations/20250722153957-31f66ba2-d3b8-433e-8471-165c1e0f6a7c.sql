-- Make section_type dynamic by changing from enum to text
-- This allows creators to add custom section types beyond the predefined ones

-- First, add a new text column
ALTER TABLE public.song_sections 
ADD COLUMN section_type_text TEXT;

-- Copy existing enum values to the new text column
UPDATE public.song_sections 
SET section_type_text = section_type::text;

-- Drop the old enum column
ALTER TABLE public.song_sections 
DROP COLUMN section_type;

-- Rename the new column to section_type
ALTER TABLE public.song_sections 
RENAME COLUMN section_type_text TO section_type;

-- Add a not null constraint since the original column was not nullable
ALTER TABLE public.song_sections 
ALTER COLUMN section_type SET NOT NULL;

-- Add a check constraint to ensure section_type is not empty
ALTER TABLE public.song_sections 
ADD CONSTRAINT section_type_not_empty CHECK (length(trim(section_type)) > 0);