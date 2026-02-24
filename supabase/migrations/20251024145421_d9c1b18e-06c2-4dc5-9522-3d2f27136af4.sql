-- Create private storage buckets for secure content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('lesson-videos', 'lesson-videos', false, 524288000, ARRAY['video/mp4', 'video/webm', 'video/ogg']::text[]),
  ('lesson-pdfs', 'lesson-pdfs', false, 52428800, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for lesson-videos bucket
CREATE POLICY "Only creators can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-videos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('creator', 'admin')
  )
);

CREATE POLICY "Only creators can delete their videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('creator', 'admin')
  )
);

-- No direct SELECT policy - access only via edge function
CREATE POLICY "No direct video access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND false
);

-- RLS policies for lesson-pdfs bucket
CREATE POLICY "Only creators can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('creator', 'admin')
  )
);

CREATE POLICY "Only creators can delete their PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('creator', 'admin')
  )
);

-- No direct SELECT policy - access only via edge function
CREATE POLICY "No direct PDF access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-pdfs' AND false
);

BEGIN
  RETURN
    EXISTS (
      SELECT 1
      FROM public.lesson_enrollments
      WHERE user_id = p_user_id
        AND lesson_id = p_lesson_id
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.lesson_whitelists
      WHERE user_id = p_user_id
        AND lesson_id = p_lesson_id
    );
END;

-- Create function to verify user enrollment
CREATE OR REPLACE FUNCTION public.verify_user_enrollment(
  p_user_id UUID,
  p_lesson_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.lesson_enrollments
    WHERE user_id = p_user_id
    AND lesson_id = p_lesson_id
  );
END;
$$;