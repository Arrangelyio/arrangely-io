-- Create storage bucket for event certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-certificates',
  'event-certificates',
  true,
  5242880, -- 5MB limit
  ARRAY['application/pdf']
);

-- Allow anyone to view certificates (public bucket)
CREATE POLICY "Anyone can view certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-certificates');

-- Allow organizers to upload certificates for their events
CREATE POLICY "Organizers can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-certificates' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.events WHERE organizer_id = auth.uid()
  )
);

-- Allow organizers to delete certificates for their events
CREATE POLICY "Organizers can delete certificates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-certificates' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.events WHERE organizer_id = auth.uid()
  )
);