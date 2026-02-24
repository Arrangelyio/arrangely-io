-- Create chord management tables for admin panel (fixed enum)

-- Chord qualities enum (removed duplicate dim7)
CREATE TYPE chord_quality AS ENUM (
  'maj', 'min', 'dim', 'aug', '7', 'maj7', 'min7', 'dim7', 'aug7',
  'sus2', 'sus4', 'add2', 'add9', 'add11', '6', '9', '11', '13',
  'm6', 'm9', 'm11', 'm13', '7sus4', 'maj7sus4', 'maj9', 'maj11', 'maj13',
  '7b5', '7#5', '7b9', '7#9', '7#11', 'maj7b5', 'maj7#5', 'maj7#11',
  'm7b5', 'm7#5', 'mMaj7', 'alt'
);

-- Chord status enum
CREATE TYPE chord_status AS ENUM ('approved', 'draft', 'deprecated');

-- Instrument enum  
CREATE TYPE instrument_type AS ENUM ('guitar', 'piano', 'both');

-- Master chords table
CREATE TABLE public.master_chords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chord_name TEXT NOT NULL,
  root_note TEXT NOT NULL,
  quality chord_quality NOT NULL,
  enharmonics TEXT[],
  instrument instrument_type NOT NULL,
  status chord_status NOT NULL DEFAULT 'draft',
  
  -- Guitar specific data
  guitar_fingering INTEGER[],
  guitar_chord_shape TEXT,
  guitar_difficulty INTEGER DEFAULT 1,
  
  -- Piano specific data  
  piano_notes TEXT[],
  piano_fingering TEXT,
  piano_hand TEXT DEFAULT 'both',
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(chord_name, instrument, root_note, quality)
);

-- Chord variations table
CREATE TABLE public.chord_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_chord_id UUID NOT NULL REFERENCES public.master_chords(id) ON DELETE CASCADE,
  variation_name TEXT,
  
  guitar_fingering INTEGER[],
  guitar_chord_shape TEXT,
  guitar_difficulty INTEGER DEFAULT 1,
  
  piano_notes TEXT[],
  piano_fingering TEXT,
  piano_hand TEXT DEFAULT 'both',
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Review queue table
CREATE TABLE public.chord_review_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chord_name TEXT NOT NULL,
  root_note TEXT,
  song_id UUID REFERENCES public.songs(id),
  user_id UUID REFERENCES auth.users(id),
  occurrence_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  mapped_to_master_id UUID REFERENCES public.master_chords(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(chord_name, song_id)
);

-- Audit log table
CREATE TABLE public.chord_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_chord_id UUID REFERENCES public.master_chords(id),
  action TEXT NOT NULL,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  editor_id UUID REFERENCES auth.users(id),
  notes TEXT,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.master_chords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chord_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Only admins can manage master chords"
ON public.master_chords FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can manage chord variations"
ON public.chord_variations FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can manage review queue"
ON public.chord_review_queue FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can view audit log"
ON public.chord_audit_log FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Indexes
CREATE INDEX idx_master_chords_chord_name ON public.master_chords(chord_name);
CREATE INDEX idx_master_chords_status ON public.master_chords(status);
CREATE INDEX idx_master_chords_usage ON public.master_chords(usage_count DESC);

-- Trigger for updated_at
CREATE TRIGGER update_master_chords_updated_at
BEFORE UPDATE ON public.master_chords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();