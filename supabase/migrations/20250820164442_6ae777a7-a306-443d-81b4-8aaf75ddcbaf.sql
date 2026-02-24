-- Create chord management tables for admin panel

-- Chord qualities enum
CREATE TYPE chord_quality AS ENUM (
  'maj', 'min', 'dim', 'aug', '7', 'maj7', 'min7', 'dim7', 'aug7',
  'sus2', 'sus4', 'add2', 'add9', 'add11', '6', '9', '11', '13',
  'm6', 'm9', 'm11', 'm13', '7sus4', 'maj7sus4', 'maj9', 'maj11', 'maj13',
  '7b5', '7#5', '7b9', '7#9', '7#11', 'maj7b5', 'maj7#5', 'maj7#11',
  'm7b5', 'm7#5', 'mMaj7', 'dim7', 'aug7', 'alt'
);

-- Chord status enum
CREATE TYPE chord_status AS ENUM ('approved', 'draft', 'deprecated');

-- Instrument enum  
CREATE TYPE instrument_type AS ENUM ('guitar', 'piano', 'both');

-- Master chords table
CREATE TABLE public.master_chords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chord_name TEXT NOT NULL, -- e.g., "C#m7", "B11", "G#7b9"
  root_note TEXT NOT NULL, -- e.g., "C", "C#", "Db"
  quality chord_quality NOT NULL,
  enharmonics TEXT[], -- e.g., ["C#", "Db"]
  instrument instrument_type NOT NULL,
  status chord_status NOT NULL DEFAULT 'draft',
  
  -- Guitar specific data
  guitar_fingering INTEGER[], -- fret positions [x,3,2,0,1,0] where x = muted
  guitar_chord_shape TEXT, -- visual representation or shape name
  guitar_difficulty INTEGER DEFAULT 1, -- 1-5 scale
  
  -- Piano specific data  
  piano_notes TEXT[], -- note names in the voicing
  piano_fingering TEXT, -- suggested fingering
  piano_hand TEXT DEFAULT 'both', -- 'left', 'right', 'both'
  
  -- Metadata
  notes TEXT, -- editorial notes
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0, -- how many songs use this chord
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique chord per instrument
  UNIQUE(chord_name, instrument, root_note, quality)
);

-- Chord variations table (for multiple voicings of same chord)
CREATE TABLE public.chord_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_chord_id UUID NOT NULL REFERENCES public.master_chords(id) ON DELETE CASCADE,
  variation_name TEXT, -- e.g., "barre", "open", "jazz voicing"
  
  -- Guitar variation data
  guitar_fingering INTEGER[],
  guitar_chord_shape TEXT,
  guitar_difficulty INTEGER DEFAULT 1,
  
  -- Piano variation data
  piano_notes TEXT[],
  piano_fingering TEXT, 
  piano_hand TEXT DEFAULT 'both',
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Review queue for unmapped chords found in user songs
CREATE TABLE public.chord_review_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chord_name TEXT NOT NULL,
  root_note TEXT,
  song_id UUID REFERENCES public.songs(id),
  user_id UUID REFERENCES auth.users(id),
  occurrence_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- 'pending', 'mapped', 'ignored'
  mapped_to_master_id UUID REFERENCES public.master_chords(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(chord_name, song_id)
);

-- Audit log for chord changes
CREATE TABLE public.chord_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_chord_id UUID REFERENCES public.master_chords(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'approved', 'deprecated', 'deleted'
  changed_fields JSONB, -- what fields were changed
  old_values JSONB, -- old values
  new_values JSONB, -- new values
  editor_id UUID REFERENCES auth.users(id),
  notes TEXT,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.master_chords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage chord data
CREATE POLICY "Only admins can manage master chords"
ON public.master_chords
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can manage chord variations"
ON public.chord_variations  
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can manage review queue"
ON public.chord_review_queue
FOR ALL  
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can view audit log"
ON public.chord_audit_log
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Indexes for performance
CREATE INDEX idx_master_chords_chord_name ON public.master_chords(chord_name);
CREATE INDEX idx_master_chords_root_note ON public.master_chords(root_note);
CREATE INDEX idx_master_chords_quality ON public.master_chords(quality);
CREATE INDEX idx_master_chords_instrument ON public.master_chords(instrument);
CREATE INDEX idx_master_chords_status ON public.master_chords(status);
CREATE INDEX idx_master_chords_usage_count ON public.master_chords(usage_count DESC);
CREATE INDEX idx_chord_review_queue_status ON public.chord_review_queue(status);
CREATE INDEX idx_chord_audit_log_action ON public.chord_audit_log(action);
CREATE INDEX idx_chord_audit_log_created_at ON public.chord_audit_log(created_at DESC);

-- Trigger for updating master_chords updated_at
CREATE TRIGGER update_master_chords_updated_at
BEFORE UPDATE ON public.master_chords
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log chord changes
CREATE OR REPLACE FUNCTION public.log_chord_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chord_audit_log (
    master_chord_id,
    action,
    changed_fields,
    old_values,
    new_values,
    editor_id
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(NEW) - to_jsonb(OLD),
    to_jsonb(OLD),
    to_jsonb(NEW), 
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for audit logging
CREATE TRIGGER chord_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.master_chords
FOR EACH ROW
EXECUTE FUNCTION public.log_chord_change();