-- Add resource_url column to lesson_content table
ALTER TABLE lesson_content 
ADD COLUMN IF NOT EXISTS resource_url TEXT;

-- Create storage bucket for lesson resources if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-resources',
  'lesson-resources',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson resources
CREATE POLICY "Public can view lesson resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-resources');

CREATE POLICY "Authenticated creators can upload lesson resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-resources' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Creators can update their own lesson resources"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lesson-resources' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Creators can delete their own lesson resources"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lesson-resources' 
  AND auth.role() = 'authenticated'
);