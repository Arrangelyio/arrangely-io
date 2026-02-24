-- Add introduction video fields to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS introduction_video_url TEXT,
ADD COLUMN IF NOT EXISTS introduction_title TEXT,
ADD COLUMN IF NOT EXISTS introduction_description TEXT;

-- Create table for lesson section visibility settings
CREATE TABLE IF NOT EXISTS public.lesson_section_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create table for featured lessons
CREATE TABLE IF NOT EXISTS public.featured_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(lesson_id, section_key)
);

-- Enable RLS
ALTER TABLE public.lesson_section_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_section_settings
CREATE POLICY "Anyone can view section settings"
ON public.lesson_section_settings
FOR SELECT
TO authenticated
USING (is_visible = true);

CREATE POLICY "Admins can manage section settings"
ON public.lesson_section_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- RLS Policies for featured_lessons
CREATE POLICY "Anyone can view featured lessons"
ON public.featured_lessons
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage featured lessons"
ON public.featured_lessons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Insert default section settings
INSERT INTO public.lesson_section_settings (section_key, is_visible, display_order)
VALUES 
  ('master_musical_journey', true, 1),
  ('featured_courses', true, 2)
ON CONFLICT (section_key) DO NOTHING;