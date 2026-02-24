-- Create enum for assessment difficulty levels
CREATE TYPE assessment_level AS ENUM ('beginner', 'intermediate', 'advanced', 'master');

-- Create assessment categories table
CREATE TABLE public.assessment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assessment sub-categories table (e.g., Guitar, Piano under Instrument)
CREATE TABLE public.assessment_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.assessment_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create assessment questions table
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.assessment_categories(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.assessment_sub_categories(id) ON DELETE CASCADE,
  level assessment_level NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  audio_url TEXT,
  image_url TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  time_limit_seconds INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user assessment progress table
CREATE TABLE public.user_assessment_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.assessment_categories(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.assessment_sub_categories(id) ON DELETE CASCADE,
  current_level assessment_level NOT NULL,
  highest_level_achieved assessment_level NOT NULL,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, sub_category_id)
);

-- Enable RLS
ALTER TABLE public.assessment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assessment_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_categories
CREATE POLICY "Anyone can view active categories"
  ON public.assessment_categories FOR SELECT
  USING (is_active = true AND is_production = true);

CREATE POLICY "Admins can manage categories"
  ON public.assessment_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- RLS Policies for assessment_sub_categories
CREATE POLICY "Anyone can view active sub-categories"
  ON public.assessment_sub_categories FOR SELECT
  USING (is_active = true AND is_production = true);

CREATE POLICY "Admins can manage sub-categories"
  ON public.assessment_sub_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- RLS Policies for assessment_questions
CREATE POLICY "Anyone can view active questions"
  ON public.assessment_questions FOR SELECT
  USING (is_active = true AND is_production = true);

CREATE POLICY "Admins can manage questions"
  ON public.assessment_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- RLS Policies for user_assessment_progress
CREATE POLICY "Users can view their own progress"
  ON public.user_assessment_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_assessment_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_assessment_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.user_assessment_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Create indexes for better performance
CREATE INDEX idx_assessment_questions_category ON public.assessment_questions(category_id);
CREATE INDEX idx_assessment_questions_sub_category ON public.assessment_questions(sub_category_id);
CREATE INDEX idx_assessment_questions_level ON public.assessment_questions(level);
CREATE INDEX idx_user_assessment_progress_user ON public.user_assessment_progress(user_id);

-- Insert default categories
INSERT INTO public.assessment_categories (name, description, icon, order_index) VALUES
  ('Instrument', 'Test your instrumental skills', 'Music', 1),
  ('Music Theory', 'Test your music theory knowledge', 'BookOpen', 2),
  ('Production', 'Test your music production skills', 'Mic2', 3),
  ('Ear Training', 'Test your ear training abilities', 'Ear', 4);