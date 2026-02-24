-- Create enum types for chord master system
DO $$ BEGIN
    CREATE TYPE public.chord_status AS ENUM ('draft', 'approved', 'deprecated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.chord_instrument AS ENUM ('guitar', 'piano', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.chord_quality AS ENUM ('maj', 'min', '7', 'maj7', 'min7', 'dim', 'aug', 'sus2', 'sus4', '6', 'add9', '9', 'maj9', 'min9', '11', '13');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create master_chords table
CREATE TABLE IF NOT EXISTS public.master_chords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chord_name TEXT NOT NULL,
  root_note TEXT NOT NULL,
  quality chord_quality NOT NULL,
  instrument chord_instrument NOT NULL DEFAULT 'both',
  status chord_status NOT NULL DEFAULT 'draft',
  formula TEXT,
  bass_note TEXT,
  notes TEXT[],
  guitar_fingering INTEGER[],
  guitar_difficulty INTEGER DEFAULT 1,
  guitar_chord_shape TEXT,
  piano_notes TEXT[],
  piano_fingering TEXT,
  piano_hand TEXT DEFAULT 'both',
  enharmonics TEXT[],
  usage_count INTEGER DEFAULT 0,
  version_number INTEGER DEFAULT 1,
  parent_version_id UUID,
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create chord_review_queue table
CREATE TABLE IF NOT EXISTS public.chord_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chord_name TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  sample_song_ids UUID[],
  suggested_root_note TEXT,
  suggested_quality TEXT,
  ai_confidence NUMERIC,
  status TEXT DEFAULT 'pending',
  mapped_to_master_id UUID,
  mapped_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create chord_audit_log table
CREATE TABLE IF NOT EXISTS public.chord_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  master_chord_id UUID,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  editor_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create chord_versions table
CREATE TABLE IF NOT EXISTS public.chord_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_chord_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  changes_diff JSONB NOT NULL,
  revert_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_production BOOLEAN DEFAULT true
);

-- Create chord_variations table
CREATE TABLE IF NOT EXISTS public.chord_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_chord_id UUID NOT NULL,
  variation_name TEXT,
  guitar_chord_shape TEXT,
  guitar_fingering INTEGER[],
  guitar_difficulty INTEGER DEFAULT 1,
  piano_notes TEXT[],
  piano_fingering TEXT,
  piano_hand TEXT DEFAULT 'both',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on all tables
ALTER TABLE public.master_chords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_variations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for master_chords
CREATE POLICY "Only admins can manage master chords" 
ON public.master_chords 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for chord_review_queue
CREATE POLICY "Only admins can manage review queue" 
ON public.chord_review_queue 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for chord_audit_log
CREATE POLICY "Only admins can view audit log" 
ON public.chord_audit_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for chord_versions
CREATE POLICY "Admins can manage chord versions" 
ON public.chord_versions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for chord_variations
CREATE POLICY "Only admins can manage chord variations" 
ON public.chord_variations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_master_chords_chord_name ON public.master_chords(chord_name);
CREATE INDEX IF NOT EXISTS idx_master_chords_status ON public.master_chords(status);
CREATE INDEX IF NOT EXISTS idx_master_chords_instrument ON public.master_chords(instrument);
CREATE INDEX IF NOT EXISTS idx_chord_review_queue_status ON public.chord_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_chord_review_queue_chord_name ON public.chord_review_queue(chord_name);

-- Add unique constraints
ALTER TABLE public.master_chords ADD CONSTRAINT unique_chord_per_instrument 
UNIQUE (chord_name, instrument, is_production);

-- Create trigger function for duplicate checking
CREATE OR REPLACE FUNCTION public.check_chord_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  existing_chord_id UUID;
  enharmonic_root TEXT;
BEGIN
  -- Check for exact match
  SELECT id INTO existing_chord_id
  FROM public.master_chords 
  WHERE root_note = NEW.root_note 
    AND quality = NEW.quality 
    AND instrument = NEW.instrument
    AND status != 'deprecated'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  IF existing_chord_id IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate chord already exists: % % for %', NEW.root_note, NEW.quality, NEW.instrument
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Check for enharmonic equivalents
  enharmonic_root := CASE NEW.root_note
    WHEN 'C#' THEN 'Db'
    WHEN 'Db' THEN 'C#'
    WHEN 'D#' THEN 'Eb'
    WHEN 'Eb' THEN 'D#'
    WHEN 'F#' THEN 'Gb'
    WHEN 'Gb' THEN 'F#'
    WHEN 'G#' THEN 'Ab'
    WHEN 'Ab' THEN 'G#'
    WHEN 'A#' THEN 'Bb'
    WHEN 'Bb' THEN 'A#'
    ELSE NULL
  END;
  
  IF enharmonic_root IS NOT NULL THEN
    SELECT id INTO existing_chord_id
    FROM public.master_chords 
    WHERE root_note = enharmonic_root 
      AND quality = NEW.quality 
      AND instrument = NEW.instrument
      AND status != 'deprecated'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    
    IF existing_chord_id IS NOT NULL THEN
      RAISE EXCEPTION 'Enharmonic equivalent already exists: % % (equivalent to % %) for %', 
        enharmonic_root, NEW.quality, NEW.root_note, NEW.quality, NEW.instrument
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER check_chord_duplicate_trigger
  BEFORE INSERT OR UPDATE ON public.master_chords
  FOR EACH ROW EXECUTE FUNCTION public.check_chord_duplicate();

CREATE TRIGGER update_master_chords_updated_at
  BEFORE UPDATE ON public.master_chords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();