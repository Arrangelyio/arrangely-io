-- Create chords table for storing detected chords
CREATE TABLE public.chords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL,
  timestamp NUMERIC NOT NULL,
  chord TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.8,
  detection_method TEXT DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Add indexes for better performance
CREATE INDEX idx_chords_video_id ON public.chords(video_id);
CREATE INDEX idx_chords_timestamp ON public.chords(timestamp);
CREATE INDEX idx_chords_video_timestamp ON public.chords(video_id, timestamp);

-- Enable Row Level Security
ALTER TABLE public.chords ENABLE ROW LEVEL SECURITY;

-- Create policies for chord access
CREATE POLICY "Chords are publicly viewable" 
ON public.chords 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert chords" 
ON public.chords 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update chords" 
ON public.chords 
FOR UPDATE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_chords_updated_at
BEFORE UPDATE ON public.chords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chords table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chords;