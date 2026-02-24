-- Drop existing policies
DROP POLICY IF EXISTS "Creators can upload lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Creators can update their lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Creators can delete their lesson videos" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled users can view lesson videos" ON storage.objects;

-- Recreate Policy: Creators can upload videos to their own folder
CREATE POLICY "Creators can upload lesson videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Recreate Policy: Creators can update their own lesson videos
CREATE POLICY "Creators can update their lesson videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Recreate Policy: Creators can delete their own lesson videos
CREATE POLICY "Creators can delete their lesson videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Recreate Policy: Enrolled users can view lesson videos
CREATE POLICY "Enrolled users can view lesson videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND
  (
    -- Allow creators to view their own videos
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Allow enrolled users to view videos
    EXISTS (
      SELECT 1
      FROM public.lesson_enrollments
      WHERE lesson_enrollments.user_id = auth.uid()
        AND lesson_enrollments.lesson_id::text = (storage.foldername(name))[2]
    )
  )
);