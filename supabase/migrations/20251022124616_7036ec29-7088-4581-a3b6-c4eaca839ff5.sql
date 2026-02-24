-- Create certificate templates table for customizable certificates
CREATE TABLE IF NOT EXISTS public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  background_image_url TEXT,
  participant_name_x INTEGER DEFAULT 400,
  participant_name_y INTEGER DEFAULT 300,
  participant_name_size INTEGER DEFAULT 32,
  participant_name_color TEXT DEFAULT '#000000',
  lesson_title_x INTEGER DEFAULT 400,
  lesson_title_y INTEGER DEFAULT 400,
  lesson_title_size INTEGER DEFAULT 24,
  lesson_title_color TEXT DEFAULT '#64C8B4',
  creator_name_x INTEGER DEFAULT 400,
  creator_name_y INTEGER DEFAULT 500,
  creator_name_size INTEGER DEFAULT 16,
  creator_name_color TEXT DEFAULT '#646464',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lesson certificates table to track generated certificates
CREATE TABLE IF NOT EXISTS public.lesson_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.lesson_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_url TEXT,
  serial_number TEXT UNIQUE,
  template_id UUID REFERENCES public.certificate_templates(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_certificates ENABLE ROW LEVEL SECURITY;

-- Policies for certificate_templates (only admins can manage)
CREATE POLICY "Anyone can view certificate templates"
  ON public.certificate_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert certificate templates"
  ON public.certificate_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update certificate templates"
  ON public.certificate_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete certificate templates"
  ON public.certificate_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policies for lesson_certificates
CREATE POLICY "Users can view their own certificates"
  ON public.lesson_certificates
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert certificates"
  ON public.lesson_certificates
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for certificate backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-templates', 'certificate-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for certificate templates
CREATE POLICY "Anyone can view certificate templates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificate-templates');

CREATE POLICY "Admins can upload certificate templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'certificate-templates' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update certificate templates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'certificate-templates' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete certificate templates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'certificate-templates' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_lesson_certificates_user_id ON public.lesson_certificates(user_id);
CREATE INDEX idx_lesson_certificates_lesson_id ON public.lesson_certificates(lesson_id);
CREATE INDEX idx_lesson_certificates_enrollment_id ON public.lesson_certificates(enrollment_id);

-- Insert a default certificate template
INSERT INTO public.certificate_templates (name, is_default)
VALUES ('Default Certificate Template', true)
ON CONFLICT DO NOTHING;