-- Phase 1: LESSON MVP Database Schema

-- Create enum types
CREATE TYPE lesson_category AS ENUM ('instrument', 'theory', 'production', 'worship_leading', 'songwriting');
CREATE TYPE lesson_difficulty AS ENUM ('beginner', 'intermediate', 'advanced', 'master');
CREATE TYPE lesson_type AS ENUM ('video', 'live', 'hybrid', 'interactive');
CREATE TYPE lesson_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE content_type AS ENUM ('video', 'text', 'audio', 'exercise', 'quiz', 'jam_session');

-- Main lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category lesson_category NOT NULL,
  difficulty_level lesson_difficulty NOT NULL,
  lesson_type lesson_type NOT NULL,
  duration_minutes INTEGER,
  price INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  status lesson_status DEFAULT 'draft',
  total_enrollments INTEGER DEFAULT 0,
  average_rating NUMERIC(3,2),
  slug TEXT UNIQUE,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lesson modules (chapters/sections)
CREATE TABLE public.lesson_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lesson content items
CREATE TABLE public.lesson_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.lesson_modules(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  content_url TEXT,
  content_data JSONB,
  duration_minutes INTEGER,
  is_preview BOOLEAN DEFAULT false,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Lesson enrollments
CREATE TABLE public.lesson_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  access_expires_at TIMESTAMP WITH TIME ZONE,
  is_production BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(lesson_id, user_id)
);

-- Lesson progress tracking
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.lesson_enrollments(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.lesson_content(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completion_date TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(enrollment_id, content_id)
);

-- Lesson reviews
CREATE TABLE public.lesson_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_lessons_creator ON public.lessons(creator_id);
CREATE INDEX idx_lessons_status ON public.lessons(status);
CREATE INDEX idx_lessons_category ON public.lessons(category);
CREATE INDEX idx_lessons_slug ON public.lessons(slug);
CREATE INDEX idx_lesson_modules_lesson ON public.lesson_modules(lesson_id);
CREATE INDEX idx_lesson_content_module ON public.lesson_content(module_id);
CREATE INDEX idx_lesson_enrollments_user ON public.lesson_enrollments(user_id);
CREATE INDEX idx_lesson_enrollments_lesson ON public.lesson_enrollments(lesson_id);
CREATE INDEX idx_lesson_progress_enrollment ON public.lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_reviews_lesson ON public.lesson_reviews(lesson_id);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lessons
CREATE POLICY "Anyone can view published lessons"
ON public.lessons FOR SELECT
USING (status = 'published' AND is_production = true);

CREATE POLICY "Creators can view their own lessons"
ON public.lessons FOR SELECT
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create lessons"
ON public.lessons FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own lessons"
ON public.lessons FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own lessons"
ON public.lessons FOR DELETE
USING (auth.uid() = creator_id);

-- RLS Policies for lesson_modules
CREATE POLICY "Anyone can view modules of published lessons"
ON public.lesson_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons 
    WHERE lessons.id = lesson_modules.lesson_id 
    AND lessons.status = 'published'
  )
);

CREATE POLICY "Creators can manage modules of their lessons"
ON public.lesson_modules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lessons 
    WHERE lessons.id = lesson_modules.lesson_id 
    AND lessons.creator_id = auth.uid()
  )
);

-- RLS Policies for lesson_content
CREATE POLICY "Anyone can view preview content"
ON public.lesson_content FOR SELECT
USING (is_preview = true);

CREATE POLICY "Enrolled users can view content"
ON public.lesson_content FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lesson_enrollments le
    JOIN public.lesson_modules lm ON lm.lesson_id = le.lesson_id
    WHERE lm.id = lesson_content.module_id
    AND le.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can manage content of their lessons"
ON public.lesson_content FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.lesson_modules lm ON lm.lesson_id = l.id
    WHERE lm.id = lesson_content.module_id
    AND l.creator_id = auth.uid()
  )
);

-- RLS Policies for lesson_enrollments
CREATE POLICY "Users can view their own enrollments"
ON public.lesson_enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in lessons"
ON public.lesson_enrollments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
ON public.lesson_enrollments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Creators can view enrollments for their lessons"
ON public.lesson_enrollments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lessons 
    WHERE lessons.id = lesson_enrollments.lesson_id 
    AND lessons.creator_id = auth.uid()
  )
);

-- RLS Policies for lesson_progress
CREATE POLICY "Users can manage their own progress"
ON public.lesson_progress FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.lesson_enrollments 
    WHERE lesson_enrollments.id = lesson_progress.enrollment_id 
    AND lesson_enrollments.user_id = auth.uid()
  )
);

-- RLS Policies for lesson_reviews
CREATE POLICY "Anyone can view reviews"
ON public.lesson_reviews FOR SELECT
USING (true);

CREATE POLICY "Enrolled users can create reviews"
ON public.lesson_reviews FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.lesson_enrollments 
    WHERE lesson_enrollments.lesson_id = lesson_reviews.lesson_id 
    AND lesson_enrollments.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own reviews"
ON public.lesson_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.lesson_reviews FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_modules_updated_at BEFORE UPDATE ON public.lesson_modules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_content_updated_at BEFORE UPDATE ON public.lesson_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_reviews_updated_at BEFORE UPDATE ON public.lesson_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique lesson slug
CREATE OR REPLACE FUNCTION generate_unique_lesson_slug(title_param TEXT, lesson_id_param UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := public.generate_seo_slug(title_param);
  final_slug := base_slug;
  
  WHILE EXISTS(
    SELECT 1 FROM public.lessons 
    WHERE slug = final_slug 
    AND (lesson_id_param IS NULL OR id != lesson_id_param)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug
CREATE OR REPLACE FUNCTION generate_lesson_slug_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    NEW.slug := generate_unique_lesson_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_lesson_slug
BEFORE INSERT OR UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION generate_lesson_slug_trigger();

-- Storage buckets for lesson content
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson-covers', 'lesson-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson-materials', 'lesson-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Lesson covers are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-covers');

CREATE POLICY "Creators can upload lesson covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Lesson videos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');

CREATE POLICY "Creators can upload lesson videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Lesson materials are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-materials');

CREATE POLICY "Creators can upload lesson materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-materials' AND
  auth.uid()::text = (storage.foldername(name))[1]
);