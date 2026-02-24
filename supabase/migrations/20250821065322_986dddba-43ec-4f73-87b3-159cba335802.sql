-- Improved chord collection with better parsing
CREATE OR REPLACE FUNCTION public.collect_chords_from_songs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  chord_record RECORD;
  song_record RECORD;
  chord_text TEXT;
  chord_array TEXT[];
  individual_chord TEXT;
  cleaned_chord TEXT;
  parsed_root TEXT;
  parsed_quality TEXT;
  existing_chord_id UUID;
  existing_review_id UUID;
  inserted_count INTEGER := 0;
  sample_songs UUID[];
BEGIN
  -- Get all songs with chord data from sections
  FOR song_record IN 
    SELECT DISTINCT s.id as song_id, s.title as song_title, s.user_id, ss.chords
    FROM public.songs s
    JOIN public.song_sections ss ON s.id = ss.song_id
    WHERE ss.chords IS NOT NULL 
    AND ss.chords != ''
    AND s.is_production = true
  LOOP
    -- Parse chords from the section - split by common chord separators
    chord_text := song_record.chords;
    -- Replace common separators with spaces and split
    chord_text := REGEXP_REPLACE(chord_text, '[|/\-\n\r\t]+', ' ', 'g');
    chord_array := STRING_TO_ARRAY(chord_text, ' ');
    
    -- Process each chord in the array
    FOREACH individual_chord IN ARRAY chord_array
    LOOP
      -- Clean up the chord text (remove extra spaces, brackets, etc.)
      cleaned_chord := TRIM(REGEXP_REPLACE(individual_chord, '[^\w#b]+', '', 'g'));
      
      -- Skip empty chords or very short ones
      IF LENGTH(cleaned_chord) < 1 OR LENGTH(cleaned_chord) > 10 THEN
        CONTINUE;
      END IF;
      
      -- Skip if it's not a valid chord pattern (must start with A-G)
      IF NOT cleaned_chord ~ '^[A-G]' THEN
        CONTINUE;
      END IF;
      
      -- Parse root note and quality
      parsed_root := SUBSTRING(cleaned_chord FROM '^([A-G][#b]?)');
      parsed_quality := CASE 
        WHEN cleaned_chord ~ 'maj7' THEN 'maj7'
        WHEN cleaned_chord ~ 'min7' OR cleaned_chord ~ 'm7' THEN 'min7'
        WHEN cleaned_chord ~ 'maj' THEN 'maj'
        WHEN cleaned_chord ~ 'min' OR cleaned_chord ~ 'm' THEN 'min'
        WHEN cleaned_chord ~ 'sus4' THEN 'sus4'
        WHEN cleaned_chord ~ 'sus2' THEN 'sus2'
        WHEN cleaned_chord ~ 'dim' THEN 'dim'
        WHEN cleaned_chord ~ 'aug' THEN 'aug'
        WHEN cleaned_chord ~ '7' THEN '7'
        ELSE 'maj'
      END;
      
      -- Check if chord already exists in master_chords
      SELECT id INTO existing_chord_id
      FROM public.master_chords 
      WHERE UPPER(chord_name) = UPPER(cleaned_chord)
      AND is_production = true
      LIMIT 1;
      
      -- Skip if already exists in master chords
      IF existing_chord_id IS NOT NULL THEN
        CONTINUE;
      END IF;
      
      -- Check if already exists in review queue
      SELECT id, sample_song_ids INTO existing_review_id, sample_songs
      FROM public.chord_review_queue 
      WHERE UPPER(chord_name) = UPPER(cleaned_chord)
      AND is_production = true
      LIMIT 1;
      
      IF existing_review_id IS NOT NULL THEN
        -- Update occurrence count and add to sample songs if not already there
        IF NOT (song_record.song_id = ANY(sample_songs)) THEN
          sample_songs := sample_songs || song_record.song_id;
        END IF;
        
        UPDATE public.chord_review_queue 
        SET 
          occurrence_count = occurrence_count + 1,
          sample_song_ids = sample_songs[1:5] -- Keep max 5 samples
        WHERE id = existing_review_id;
      ELSE
        -- Insert new chord into review queue with parsed data
        INSERT INTO public.chord_review_queue (
          chord_name,
          occurrence_count,
          sample_song_ids,
          suggested_root_note,
          suggested_quality,
          status,
          is_production,
          ai_confidence
        ) VALUES (
          cleaned_chord,
          1,
          ARRAY[song_record.song_id],
          parsed_root,
          parsed_quality,
          'pending',
          true,
          0.8 -- Higher confidence since we parsed it
        );
        inserted_count := inserted_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN inserted_count;
END;
$function$;

-- Add function to update chord references in songs when master chords are updated
CREATE OR REPLACE FUNCTION public.update_chord_references_in_songs(
  old_chord_name TEXT,
  new_chord_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  song_section_record RECORD;
  updated_chords TEXT;
BEGIN
  -- Update all song sections that contain the old chord name
  FOR song_section_record IN
    SELECT id, chords, song_id
    FROM public.song_sections
    WHERE chords ILIKE '%' || old_chord_name || '%'
    AND chords IS NOT NULL
  LOOP
    -- Replace the chord name in the chords text
    updated_chords := REGEXP_REPLACE(
      song_section_record.chords, 
      '\y' || old_chord_name || '\y', 
      new_chord_data->>'chord_name', 
      'g'
    );
    
    -- Update the song section with new chord data
    UPDATE public.song_sections 
    SET 
      chords = updated_chords,
      updated_at = now()
    WHERE id = song_section_record.id;
  END LOOP;
END;
$function$;