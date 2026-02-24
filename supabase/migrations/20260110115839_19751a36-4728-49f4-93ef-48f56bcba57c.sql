-- Create mixer_presets table
CREATE TABLE public.mixer_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequencer_file_id UUID NOT NULL REFERENCES sequencer_files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  
  -- Track settings (stored as JSONB array)
  tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Master volume
  master_volume NUMERIC NOT NULL DEFAULT 1,
  
  -- Click track settings
  click_enabled BOOLEAN DEFAULT false,
  click_volume NUMERIC DEFAULT 0.5,
  click_tempo NUMERIC DEFAULT 120,
  click_subdivision TEXT DEFAULT 'quarter',
  click_start_offset NUMERIC DEFAULT 0,
  
  -- Cue track settings
  cue_enabled BOOLEAN DEFAULT false,
  cue_volume NUMERIC DEFAULT 0.5,
  cue_voice TEXT DEFAULT 'female1',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true,
  
  -- Unique constraint: one preset name per user per sequencer file
  UNIQUE(user_id, sequencer_file_id, name)
);

-- Enable RLS
ALTER TABLE public.mixer_presets ENABLE ROW LEVEL SECURITY;

-- Users can view their own presets
CREATE POLICY "Users can view own mixer presets" 
  ON public.mixer_presets FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own presets
CREATE POLICY "Users can create own mixer presets" 
  ON public.mixer_presets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presets
CREATE POLICY "Users can update own mixer presets" 
  ON public.mixer_presets FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own presets
CREATE POLICY "Users can delete own mixer presets" 
  ON public.mixer_presets FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_mixer_presets_updated_at
  BEFORE UPDATE ON public.mixer_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();