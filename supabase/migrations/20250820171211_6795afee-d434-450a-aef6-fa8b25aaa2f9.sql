-- Add versioning support to master_chords
ALTER TABLE public.master_chords 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES public.master_chords(id);

-- Create chord_versions table for storing diffs
CREATE TABLE IF NOT EXISTS public.chord_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_chord_id UUID NOT NULL REFERENCES public.master_chords(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes_diff JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_production BOOLEAN DEFAULT true,
  revert_reason TEXT
);

-- Update chord_review_queue to support better mapping
ALTER TABLE public.chord_review_queue 
ADD COLUMN IF NOT EXISTS suggested_root_note TEXT,
ADD COLUMN IF NOT EXISTS suggested_quality TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS sample_song_ids UUID[],
ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
ADD COLUMN IF NOT EXISTS mapped_by UUID REFERENCES auth.users(id);

-- Create function to prevent duplicate master chords
CREATE OR REPLACE FUNCTION public.check_chord_duplicate()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate checking
DROP TRIGGER IF EXISTS check_chord_duplicate_trigger ON public.master_chords;
CREATE TRIGGER check_chord_duplicate_trigger
  BEFORE INSERT OR UPDATE ON public.master_chords
  FOR EACH ROW EXECUTE FUNCTION public.check_chord_duplicate();

-- Create function to create chord version on update
CREATE OR REPLACE FUNCTION public.create_chord_version()
RETURNS TRIGGER AS $$
DECLARE
  changes_data JSONB;
  new_version_number INTEGER;
BEGIN
  -- Only create version for updates, not inserts
  IF TG_OP = 'UPDATE' THEN
    -- Calculate the diff between old and new
    changes_data := jsonb_build_object(
      'old_values', row_to_json(OLD),
      'new_values', row_to_json(NEW),
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::jsonb)
        WHERE key NOT IN ('updated_at', 'version_number')
          AND value != (row_to_json(OLD)::jsonb ->> key)::jsonb
      )
    );
    
    -- Increment version number
    new_version_number := COALESCE(OLD.version_number, 1) + 1;
    NEW.version_number := new_version_number;
    
    -- Insert version record
    INSERT INTO public.chord_versions (
      master_chord_id,
      version_number,
      changes_diff,
      created_by
    ) VALUES (
      NEW.id,
      new_version_number,
      changes_data,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for versioning
DROP TRIGGER IF EXISTS create_chord_version_trigger ON public.master_chords;
CREATE TRIGGER create_chord_version_trigger
  BEFORE UPDATE ON public.master_chords
  FOR EACH ROW EXECUTE FUNCTION public.create_chord_version();

-- Enable RLS on new tables
ALTER TABLE public.chord_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for chord_versions
CREATE POLICY "Admins can manage chord versions" ON public.chord_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Update audit log trigger to be more comprehensive
CREATE OR REPLACE FUNCTION public.log_chord_audit()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  changed_fields_data JSONB;
BEGIN
  action_type := TG_OP;
  
  IF TG_OP = 'UPDATE' THEN
    changed_fields_data := (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(row_to_json(NEW)::jsonb)
      WHERE key NOT IN ('updated_at')
        AND value != (row_to_json(OLD)::jsonb ->> key)::jsonb
    );
  ELSE
    changed_fields_data := NULL;
  END IF;
  
  INSERT INTO public.chord_audit_log (
    action,
    master_chord_id,
    changed_fields,
    old_values,
    new_values,
    editor_id,
    notes
  ) VALUES (
    action_type,
    COALESCE(NEW.id, OLD.id),
    changed_fields_data,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Chord created'
      WHEN TG_OP = 'UPDATE' THEN 'Chord updated'
      WHEN TG_OP = 'DELETE' THEN 'Chord deleted'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive audit trigger
DROP TRIGGER IF EXISTS log_chord_audit_trigger ON public.master_chords;
CREATE TRIGGER log_chord_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.master_chords
  FOR EACH ROW EXECUTE FUNCTION public.log_chord_audit();

-- Function to get chord review queue with enhanced data
CREATE OR REPLACE FUNCTION public.get_chord_review_queue()
RETURNS TABLE (
  id UUID,
  chord_name TEXT,
  occurrence_count INTEGER,
  sample_song_titles TEXT[],
  suggested_root_note TEXT,
  suggested_quality TEXT,
  ai_confidence DECIMAL,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    crq.id,
    crq.chord_name,
    crq.occurrence_count,
    ARRAY(
      SELECT s.title 
      FROM public.songs s 
      WHERE s.id = ANY(crq.sample_song_ids)
      LIMIT 3
    ) as sample_song_titles,
    crq.suggested_root_note,
    crq.suggested_quality,
    crq.ai_confidence,
    crq.status,
    crq.created_at
  FROM public.chord_review_queue crq
  WHERE crq.is_production = true
  ORDER BY crq.occurrence_count DESC, crq.created_at DESC;
$$;