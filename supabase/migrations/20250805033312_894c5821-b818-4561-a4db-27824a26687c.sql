-- Create chord_grids table to store chord grid data
CREATE TABLE public.chord_grids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  song_key TEXT NOT NULL DEFAULT 'C',
  tempo INTEGER DEFAULT 120,
  time_signature TEXT NOT NULL DEFAULT '4/4',
  capo INTEGER DEFAULT 0,
  bars_per_line INTEGER DEFAULT 4,
  view_mode TEXT DEFAULT 'basic',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.chord_grids ENABLE ROW LEVEL SECURITY;

-- Create policies for chord_grids
CREATE POLICY "Users can view their own chord grids" 
ON public.chord_grids 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chord grids" 
ON public.chord_grids 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chord grids" 
ON public.chord_grids 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chord grids" 
ON public.chord_grids 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chord_grids_updated_at
BEFORE UPDATE ON public.chord_grids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();