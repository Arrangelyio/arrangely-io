-- Create storage bucket for lesson certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-certificates', 'lesson-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson certificates
CREATE POLICY "Anyone can view lesson certificates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-certificates');

CREATE POLICY "Users can upload their own certificates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lesson-certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );