-- Add learning_outcomes column to lessons table
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment to document the column
COMMENT ON COLUMN public.lessons.learning_outcomes IS 'Dynamic list of learning outcomes/goals that students will achieve in this lesson';