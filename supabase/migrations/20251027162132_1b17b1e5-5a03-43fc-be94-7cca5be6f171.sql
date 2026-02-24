-- Add columns to lesson_progress table to store quiz data
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS quiz_answers jsonb,
ADD COLUMN IF NOT EXISTS quiz_score integer,
ADD COLUMN IF NOT EXISTS quiz_total_questions integer;