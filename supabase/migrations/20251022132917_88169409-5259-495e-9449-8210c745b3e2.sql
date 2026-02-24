-- Ensure the storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-certificates', 'lesson-certificates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for lesson certificates
DROP POLICY IF EXISTS "Lesson certificates are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own lesson certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own lesson certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own lesson certificates" ON storage.objects;

CREATE POLICY "Lesson certificates are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lesson-certificates');

CREATE POLICY "Users can upload their own lesson certificates"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own lesson certificates"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lesson-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'lesson-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own lesson certificates"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lesson-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- lesson_certificates table: allow users to read their own cert records
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.lesson_certificates;

CREATE POLICY "Users can view their own certificates"
ON public.lesson_certificates
FOR SELECT
USING (auth.uid() = user_id);