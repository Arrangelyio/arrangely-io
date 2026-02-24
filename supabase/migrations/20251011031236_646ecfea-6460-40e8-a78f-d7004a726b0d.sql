-- Create enum for tier levels (only if not exists)
DO $$ BEGIN
  CREATE TYPE tier_level AS ENUM ('beginner', 'intermediate', 'advanced', 'master');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for categories (only if not exists)
DO $$ BEGIN
  CREATE TYPE assessment_category AS ENUM ('instrument', 'theory', 'production', 'worship_leading', 'songwriting');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- instrument_type already exists, skip

-- Create enum for tier status (only if not exists)
DO $$ BEGIN
  CREATE TYPE tier_status AS ENUM ('locked', 'in_progress', 'passed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category assessment_category NOT NULL,
  sub_category TEXT,
  tier_level tier_level NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  difficulty_score INTEGER NOT NULL CHECK (difficulty_score BETWEEN 1 AND 10),
  media_url TEXT,
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_tier_progress table
CREATE TABLE IF NOT EXISTS public.user_tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category assessment_category NOT NULL,
  sub_category TEXT,
  current_tier tier_level NOT NULL DEFAULT 'beginner',
  tier_status tier_status NOT NULL DEFAULT 'in_progress',
  questions_seen UUID[] DEFAULT ARRAY[]::UUID[],
  questions_answered JSONB DEFAULT '[]'::jsonb,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  tier_unlocked_at TIMESTAMP WITH TIME ZONE,
  tier_completed_at TIMESTAMP WITH TIME ZONE,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, sub_category, current_tier, is_production)
);

-- Add columns to profiles table (only if not exists)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS primary_category assessment_category,
ADD COLUMN IF NOT EXISTS primary_instrument instrument_type,
ADD COLUMN IF NOT EXISTS skill_tiers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS tier_assessment_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS tier_completed_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tier_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_questions
DROP POLICY IF EXISTS "Active questions are viewable by authenticated users" ON public.quiz_questions;
CREATE POLICY "Active questions are viewable by authenticated users"
ON public.quiz_questions FOR SELECT
TO authenticated
USING (is_active = true AND is_production = true);

DROP POLICY IF EXISTS "Admins can manage quiz questions" ON public.quiz_questions;
CREATE POLICY "Admins can manage quiz questions"
ON public.quiz_questions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- RLS Policies for user_tier_progress
DROP POLICY IF EXISTS "Users can view their own tier progress" ON public.user_tier_progress;
CREATE POLICY "Users can view their own tier progress"
ON public.user_tier_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tier progress" ON public.user_tier_progress;
CREATE POLICY "Users can insert their own tier progress"
ON public.user_tier_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tier progress" ON public.user_tier_progress;
CREATE POLICY "Users can update their own tier progress"
ON public.user_tier_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all tier progress" ON public.user_tier_progress;
CREATE POLICY "Admins can view all tier progress"
ON public.user_tier_progress FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category_tier ON public.quiz_questions(category, tier_level, is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_sub_category ON public.quiz_questions(sub_category, tier_level, is_active);
CREATE INDEX IF NOT EXISTS idx_user_tier_progress_user ON public.user_tier_progress(user_id, is_production);
CREATE INDEX IF NOT EXISTS idx_user_tier_progress_category ON public.user_tier_progress(category, sub_category);

-- Create trigger for updated_at (only if not exists)
DROP TRIGGER IF EXISTS update_quiz_questions_updated_at ON public.quiz_questions;
CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_tier_progress_updated_at ON public.user_tier_progress;
CREATE TRIGGER update_user_tier_progress_updated_at
  BEFORE UPDATE ON public.user_tier_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample questions for Piano Beginner (MVP)
INSERT INTO public.quiz_questions (category, sub_category, tier_level, question_text, question_type, options, correct_answer, difficulty_score, explanation) VALUES
('instrument', 'piano', 'beginner', 'Which finger is typically used to play Middle C in the right hand?', 'multiple_choice', 
'[{"id": "a", "text": "Thumb (1)"}, {"id": "b", "text": "Index (2)"}, {"id": "c", "text": "Middle (3)"}, {"id": "d", "text": "Ring (4)"}]'::jsonb, 
'a', 2, 'The thumb (finger 1) is typically used for Middle C in the right hand as it provides the most natural hand position.'),

('instrument', 'piano', 'beginner', 'What are the black keys on a piano called?', 'multiple_choice',
'[{"id": "a", "text": "Flats and sharps"}, {"id": "b", "text": "Accidentals"}, {"id": "c", "text": "Half steps"}, {"id": "d", "text": "Both A and B"}]'::jsonb,
'd', 3, 'Black keys are called both flats/sharps and accidentals, as they modify the natural notes.'),

('instrument', 'piano', 'beginner', 'How many white keys are on a standard 88-key piano?', 'multiple_choice',
'[{"id": "a", "text": "36"}, {"id": "b", "text": "52"}, {"id": "c", "text": "64"}, {"id": "d", "text": "72"}]'::jsonb,
'b', 4, 'A standard 88-key piano has 52 white keys and 36 black keys.'),

('instrument', 'piano', 'beginner', 'What is a C major chord made of?', 'multiple_choice',
'[{"id": "a", "text": "C-E-G"}, {"id": "b", "text": "C-D-E"}, {"id": "c", "text": "C-F-G"}, {"id": "d", "text": "C-E-F"}]'::jsonb,
'a', 5, 'The C major chord consists of the notes C (root), E (major third), and G (perfect fifth).'),

('instrument', 'piano', 'beginner', 'Which hand typically plays the bass clef?', 'multiple_choice',
'[{"id": "a", "text": "Right hand"}, {"id": "b", "text": "Left hand"}, {"id": "c", "text": "Both hands"}, {"id": "d", "text": "Neither hand"}]'::jsonb,
'b', 2, 'The left hand typically plays the bass clef (lower notes), while the right hand plays the treble clef.');

-- Insert sample questions for Theory Beginner
INSERT INTO public.quiz_questions (category, sub_category, tier_level, question_text, question_type, options, correct_answer, difficulty_score, explanation) VALUES
('theory', NULL, 'beginner', 'How many beats does a whole note receive in 4/4 time?', 'multiple_choice',
'[{"id": "a", "text": "1 beat"}, {"id": "b", "text": "2 beats"}, {"id": "c", "text": "3 beats"}, {"id": "d", "text": "4 beats"}]'::jsonb,
'd', 2, 'In 4/4 time, a whole note receives 4 beats, lasting the entire measure.'),

('theory', NULL, 'beginner', 'What is the distance between two notes called?', 'multiple_choice',
'[{"id": "a", "text": "Chord"}, {"id": "b", "text": "Interval"}, {"id": "c", "text": "Scale"}, {"id": "d", "text": "Harmony"}]'::jsonb,
'b', 3, 'An interval is the distance in pitch between two notes.');

-- Insert sample questions for Production Beginner
INSERT INTO public.quiz_questions (category, sub_category, tier_level, question_text, question_type, options, correct_answer, difficulty_score, explanation) VALUES
('production', NULL, 'beginner', 'What does DAW stand for?', 'multiple_choice',
'[{"id": "a", "text": "Digital Audio Workstation"}, {"id": "b", "text": "Digital Audio Wave"}, {"id": "c", "text": "Direct Audio Workflow"}, {"id": "d", "text": "Digital Analog Workspace"}]'::jsonb,
'a', 2, 'DAW stands for Digital Audio Workstation, software used for recording and producing music.'),

('production', NULL, 'beginner', 'What is the standard sample rate for CD-quality audio?', 'multiple_choice',
'[{"id": "a", "text": "22.05 kHz"}, {"id": "b", "text": "44.1 kHz"}, {"id": "c", "text": "48 kHz"}, {"id": "d", "text": "96 kHz"}]'::jsonb,
'b', 4, '44.1 kHz is the standard sample rate for CD-quality audio, capturing frequencies up to 22.05 kHz.')
ON CONFLICT DO NOTHING;