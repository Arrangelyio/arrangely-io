-- Add learning_outcomes column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lessons' AND column_name = 'learning_outcomes'
  ) THEN
    ALTER TABLE lessons ADD COLUMN learning_outcomes TEXT[];
  END IF;
END $$;

-- Add video_url column to lesson_content if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lesson_content' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE lesson_content ADD COLUMN video_url TEXT;
  END IF;
END $$;

-- Now update existing lessons with learning outcomes
UPDATE lessons 
SET learning_outcomes = ARRAY[
  'Master fundamental guitar chords including C, G, D, Em, and Am',
  'Learn proper finger placement and hand positioning',
  'Play smooth chord transitions and develop muscle memory',
  'Understand basic music theory behind chord construction',
  'Practice with popular songs that use these chords'
]
WHERE slug = 'guitar-basics-your-first-chords';

UPDATE lessons 
SET learning_outcomes = ARRAY[
  'Develop a strong understanding of vocal technique fundamentals',
  'Learn proper breathing techniques for sustained notes',
  'Improve pitch accuracy and vocal range',
  'Master warm-up exercises used by professionals',
  'Apply techniques to your favorite songs'
]
WHERE slug = 'vocal-techniques-for-beginners';

UPDATE lessons 
SET learning_outcomes = ARRAY[
  'Understand piano keys, notes, and basic music notation',
  'Play simple melodies and popular songs',
  'Develop proper hand posture and finger technique',
  'Learn to read sheet music at a beginner level',
  'Practice coordination between left and right hands'
]
WHERE slug = 'piano-101-start-playing-today';

UPDATE lessons 
SET learning_outcomes = ARRAY[
  'Master essential drumming patterns and rhythms',
  'Learn proper stick grip and striking techniques',
  'Develop timing and coordination skills',
  'Play along with popular songs in various genres',
  'Understand drum notation and rudiments'
]
WHERE slug = 'drumming-basics-rhythm-foundation';

UPDATE lessons 
SET learning_outcomes = ARRAY[
  'Complete understanding of music theory fundamentals',
  'Read and write musical notation confidently',
  'Identify intervals, scales, and chord progressions',
  'Apply theory concepts to your instrument',
  'Analyze songs and understand their structure'
]
WHERE slug = 'music-theory-essentials';

UPDATE lessons 
SET learning_outcomes = ARRAY[
  'Master advanced guitar techniques including bending and vibrato',
  'Play complex solos and improvisations',
  'Understand scales and modes for lead guitar',
  'Develop speed and accuracy in your playing',
  'Learn signature techniques from guitar legends'
]
WHERE slug = 'advanced-guitar-techniques';

-- Update lesson content with sample video URLs (YouTube embeds)
UPDATE lesson_content 
SET 
  video_url = 'https://www.youtube.com/embed/4btJamK79d4',
  is_preview = true
WHERE title = 'Welcome to Guitar Basics';

UPDATE lesson_content 
SET video_url = 'https://www.youtube.com/embed/0s8EDqFB7dw'
WHERE title = 'Understanding Your Guitar';

UPDATE lesson_content 
SET 
  video_url = 'https://www.youtube.com/embed/b-QKY8BLMyY',
  is_preview = true
WHERE title = 'Hand Position and Posture';

UPDATE lesson_content 
SET video_url = 'https://www.youtube.com/embed/0s8EDqFB7dw'
WHERE title = 'Reading Guitar Tabs';

UPDATE lesson_content 
SET video_url = 'https://www.youtube.com/embed/4btJamK79d4'
WHERE title = 'Your First Chord: C Major';

UPDATE lesson_content 
SET 
  video_url = 'https://www.youtube.com/embed/rEeiRlYDbds',
  is_preview = true
WHERE title = 'G Major Chord';

UPDATE lesson_content 
SET video_url = 'https://www.youtube.com/embed/0s8EDqFB7dw'
WHERE title = 'D Major Chord';

UPDATE lesson_content 
SET video_url = 'https://www.youtube.com/embed/4btJamK79d4'
WHERE title = 'E Minor Chord';

UPDATE lesson_content 
SET video_url = 'https://www.youtube.com/embed/b-QKY8BLMyY'
WHERE title = 'A Minor Chord';