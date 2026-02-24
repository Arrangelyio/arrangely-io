-- Create function to collect chords from all user songs and populate review queue
CREATE OR REPLACE FUNCTION collect_chords_from_songs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  chord_record RECORD;
  song_record RECORD;
  chord_text TEXT;
  chord_array TEXT[];
  individual_chord TEXT;
  cleaned_chord TEXT;
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
        -- Insert new chord into review queue
        INSERT INTO public.chord_review_queue (
          chord_name,
          occurrence_count,
          sample_song_ids,
          status,
          is_production,
          ai_confidence
        ) VALUES (
          cleaned_chord,
          1,
          ARRAY[song_record.song_id],
          'pending',
          true,
          0.5 -- Default confidence
        );
        inserted_count := inserted_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN inserted_count;
END;
$$;