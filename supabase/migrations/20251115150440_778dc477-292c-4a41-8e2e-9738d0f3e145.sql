-- Create table for sequencer files
CREATE TABLE public.sequencer_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tempo DECIMAL NOT NULL,
  time_signature TEXT NOT NULL DEFAULT '4/4',
  sequencer_data JSONB NOT NULL, -- Structure: sections, markers, loops
  storage_folder_path TEXT NOT NULL, -- Path to folder containing WAV files in storage
  tracks JSONB NOT NULL, -- Array of track metadata: [{name, filename, color, default_volume, default_pan}]
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.sequencer_files ENABLE ROW LEVEL SECURITY;

-- Policies for sequencer_files
CREATE POLICY "Sequencer files are viewable by everyone"
ON public.sequencer_files
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create sequencer files"
ON public.sequencer_files
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own sequencer files"
ON public.sequencer_files
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own sequencer files"
ON public.sequencer_files
FOR DELETE
USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_sequencer_files_updated_at
BEFORE UPDATE ON public.sequencer_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_sequencer_files_song_id ON public.sequencer_files(song_id);
CREATE INDEX idx_sequencer_files_created_by ON public.sequencer_files(created_by);