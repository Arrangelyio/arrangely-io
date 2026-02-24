-- Create storage bucket for event media
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event media
CREATE POLICY "Anyone can view event media"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-media');

CREATE POLICY "Organizers can upload media for their events"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-media' AND
  auth.uid() IN (
    SELECT organizer_id FROM public.events
    WHERE id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Organizers can delete their event media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-media' AND
  auth.uid() IN (
    SELECT organizer_id FROM public.events
    WHERE id::text = (storage.foldername(name))[1]
  )
);