-- Add new content types for sheet music and interactive exercises
DO $$
BEGIN
  -- Add sheet_music if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'sheet_music' 
    AND enumtypid = 'content_type'::regtype
  ) THEN
    ALTER TYPE content_type ADD VALUE 'sheet_music';
  END IF;

  -- Add interactive_exercise if it doesn't exist  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'interactive_exercise' 
    AND enumtypid = 'content_type'::regtype
  ) THEN
    ALTER TYPE content_type ADD VALUE 'interactive_exercise';
  END IF;

  -- Add chord_chart if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'chord_chart' 
    AND enumtypid = 'content_type'::regtype
  ) THEN
    ALTER TYPE content_type ADD VALUE 'chord_chart';
  END IF;
END $$;

-- Create table for sheet music files with enhanced protection
CREATE TABLE IF NOT EXISTS public.sheet_music_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES lesson_content(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  thumbnail_url text,
  page_count integer DEFAULT 1,
  file_hash text,
  watermark_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sheet_music_files ENABLE ROW LEVEL SECURITY;

-- Only enrolled users can view sheet music
CREATE POLICY "Enrolled users can view sheet music"
ON public.sheet_music_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lesson_content lc
    JOIN lesson_modules lm ON lc.module_id = lm.id
    JOIN lesson_enrollments le ON lm.lesson_id = le.lesson_id
    WHERE lc.id = sheet_music_files.content_id
    AND le.user_id = auth.uid()
  )
);

-- Creators can manage their sheet music
CREATE POLICY "Creators can manage sheet music"
ON public.sheet_music_files FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM lesson_content lc
    JOIN lesson_modules lm ON lc.module_id = lm.id
    JOIN lessons l ON lm.lesson_id = l.id
    WHERE lc.id = sheet_music_files.content_id
    AND l.creator_id = auth.uid()
  )
);

-- Create table for interactive exercises
CREATE TABLE IF NOT EXISTS public.interactive_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES lesson_content(id) ON DELETE CASCADE,
  exercise_type text NOT NULL,
  exercise_data jsonb NOT NULL,
  difficulty integer DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  completion_criteria jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.interactive_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view exercises"
ON public.interactive_exercises FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lesson_content lc
    JOIN lesson_modules lm ON lc.module_id = lm.id
    JOIN lesson_enrollments le ON lm.lesson_id = le.lesson_id
    WHERE lc.id = interactive_exercises.content_id
    AND le.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can manage exercises"
ON public.interactive_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM lesson_content lc
    JOIN lesson_modules lm ON lc.module_id = lm.id  
    JOIN lessons l ON lm.lesson_id = l.id
    WHERE lc.id = interactive_exercises.content_id
    AND l.creator_id = auth.uid()
  )
);

-- Track exercise completions
CREATE TABLE IF NOT EXISTS public.exercise_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES interactive_exercises(id) ON DELETE CASCADE,
  score integer,
  time_taken_seconds integer,
  completed_at timestamp with time zone DEFAULT now(),
  attempt_data jsonb
);

ALTER TABLE public.exercise_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own completions"
ON public.exercise_completions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own completions"
ON public.exercise_completions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sheet_music_content ON sheet_music_files(content_id);
CREATE INDEX IF NOT EXISTS idx_exercises_content ON interactive_exercises(content_id);
CREATE INDEX IF NOT EXISTS idx_exercise_completions_user ON exercise_completions(user_id, exercise_id);