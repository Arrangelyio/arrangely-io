-- Create interactive_exercise table for lesson exercises
CREATE TABLE IF NOT EXISTS public.interactive_exercise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  enable_camera_recording BOOLEAN NOT NULL DEFAULT false,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_interactive_exercise_lesson_id ON public.interactive_exercise(lesson_id);
CREATE INDEX IF NOT EXISTS idx_interactive_exercise_type ON public.interactive_exercise(exercise_type);

-- Enable RLS
ALTER TABLE public.interactive_exercise ENABLE ROW LEVEL SECURITY;

-- Creators can view exercises for their lessons
CREATE POLICY "Creators can view their lesson exercises"
ON public.interactive_exercise
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = interactive_exercise.lesson_id
    AND lessons.creator_id = auth.uid()
  )
);

-- Creators can insert exercises for their lessons
CREATE POLICY "Creators can create exercises for their lessons"
ON public.interactive_exercise
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = interactive_exercise.lesson_id
    AND lessons.creator_id = auth.uid()
  )
);

-- Creators can update exercises for their lessons
CREATE POLICY "Creators can update their lesson exercises"
ON public.interactive_exercise
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = interactive_exercise.lesson_id
    AND lessons.creator_id = auth.uid()
  )
);

-- Creators can delete exercises for their lessons
CREATE POLICY "Creators can delete their lesson exercises"
ON public.interactive_exercise
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons.id = interactive_exercise.lesson_id
    AND lessons.creator_id = auth.uid()
  )
);

-- Students can view exercises for lessons they have access to (if lesson_enrollments exists)
CREATE POLICY "Students can view exercises for enrolled lessons"
ON public.interactive_exercise
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lesson_enrollments
    WHERE lesson_enrollments.lesson_id = interactive_exercise.lesson_id
    AND lesson_enrollments.user_id = auth.uid()
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interactive_exercise_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interactive_exercise_updated_at_trigger
BEFORE UPDATE ON public.interactive_exercise
FOR EACH ROW
EXECUTE FUNCTION update_interactive_exercise_updated_at();