-- Create RLS policies for sequencer-files storage bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder in sequencer-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sequencer-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files in sequencer-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sequencer-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files in sequencer-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sequencer-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view/download files
CREATE POLICY "Public access to sequencer-files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'sequencer-files');