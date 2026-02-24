-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true);

-- Create policy for public access to event images
CREATE POLICY "Event images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-images');

-- Create policy for authenticated users to upload event images  
CREATE POLICY "Authenticated users can upload event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update event images
CREATE POLICY "Authenticated users can update event images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-images' AND auth.role() = 'authenticated');