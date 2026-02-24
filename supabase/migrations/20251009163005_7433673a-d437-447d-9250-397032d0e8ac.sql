-- Insert sample lesson data for testing

-- First, let's create a sample creator (if not exists)
-- Insert sample lessons
INSERT INTO public.lessons (
  creator_id,
  title,
  description,
  cover_image_url,
  category,
  difficulty_level,
  lesson_type,
  duration_minutes,
  price,
  is_free,
  status,
  published_at,
  slug,
  is_production
) VALUES
  -- Free beginner guitar lesson
  (
    (SELECT user_id FROM public.profiles WHERE role IN ('creator', 'admin') LIMIT 1),
    'Guitar Basics: Your First Chords',
    'Learn the essential guitar chords every beginner needs to know. Master C, G, D, Em, and Am chords with proper finger positioning and strumming techniques.',
    'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
    'instrument',
    'beginner',
    'video',
    45,
    0,
    true,
    'published',
    now(),
    'guitar-basics-your-first-chords',
    true
  ),
  -- Paid intermediate piano lesson
  (
    (SELECT user_id FROM public.profiles WHERE role IN ('creator', 'admin') LIMIT 1),
    'Jazz Piano Foundations',
    'Dive into the world of jazz piano with essential voicings, progressions, and improvisation techniques. Perfect for intermediate players.',
    'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
    'instrument',
    'intermediate',
    'video',
    120,
    99000,
    false,
    'published',
    now(),
    'jazz-piano-foundations',
    true
  ),
  -- Music theory lesson
  (
    (SELECT user_id FROM public.profiles WHERE role IN ('creator', 'admin') LIMIT 1),
    'Music Theory Essentials',
    'Master the fundamentals of music theory including scales, intervals, chord construction, and harmonic analysis.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    'theory',
    'beginner',
    'hybrid',
    90,
    149000,
    false,
    'published',
    now(),
    'music-theory-essentials',
    true
  ),
  -- Production lesson
  (
    (SELECT user_id FROM public.profiles WHERE role IN ('creator', 'admin') LIMIT 1),
    'Modern Music Production with DAWs',
    'Learn professional music production techniques, mixing, mastering, and how to use popular DAWs effectively.',
    'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
    'production',
    'intermediate',
    'video',
    180,
    199000,
    false,
    'published',
    now(),
    'modern-music-production-with-daws',
    true
  ),
  -- Worship leading lesson
  (
    (SELECT user_id FROM public.profiles WHERE role IN ('creator', 'admin') LIMIT 1),
    'Worship Leading Masterclass',
    'Learn how to lead worship effectively, create engaging setlists, and build a strong worship team culture.',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    'worship_leading',
    'intermediate',
    'live',
    60,
    79000,
    false,
    'published',
    now(),
    'worship-leading-masterclass',
    true
  ),
  -- Advanced songwriting
  (
    (SELECT user_id FROM public.profiles WHERE role IN ('creator', 'admin') LIMIT 1),
    'Songwriting: From Idea to Hit',
    'Discover the secrets of professional songwriting. Learn melody creation, lyric writing, song structure, and arrangement.',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    'songwriting',
    'advanced',
    'video',
    150,
    249000,
    false,
    'published',
    now(),
    'songwriting-from-idea-to-hit',
    true
  );

-- Insert sample modules for the first lesson (Guitar Basics)
WITH first_lesson AS (
  SELECT id FROM public.lessons WHERE slug = 'guitar-basics-your-first-chords' LIMIT 1
)
INSERT INTO public.lesson_modules (
  lesson_id,
  title,
  description,
  order_index,
  is_locked
) VALUES
  (
    (SELECT id FROM first_lesson),
    'Introduction',
    'Welcome to the course and overview of what you will learn',
    0,
    false
  ),
  (
    (SELECT id FROM first_lesson),
    'Your First Chord: C Major',
    'Learn the C major chord with proper finger positioning',
    1,
    false
  ),
  (
    (SELECT id FROM first_lesson),
    'Building Your Chord Vocabulary',
    'Master G, D, Em, and Am chords',
    2,
    true
  ),
  (
    (SELECT id FROM first_lesson),
    'Strumming Patterns',
    'Essential strumming techniques and patterns',
    3,
    true
  );

-- Insert sample content for the first module
WITH intro_module AS (
  SELECT lm.id 
  FROM public.lesson_modules lm
  JOIN public.lessons l ON l.id = lm.lesson_id
  WHERE l.slug = 'guitar-basics-your-first-chords' 
  AND lm.order_index = 0
  LIMIT 1
)
INSERT INTO public.lesson_content (
  module_id,
  content_type,
  title,
  description,
  order_index,
  content_url,
  duration_minutes,
  is_preview
) VALUES
  (
    (SELECT id FROM intro_module),
    'video',
    'Welcome Video',
    'Get to know your instructor and course overview',
    0,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    5,
    true
  ),
  (
    (SELECT id FROM intro_module),
    'text',
    'Course Materials',
    'Download your chord charts and practice guide',
    1,
    NULL,
    2,
    true
  );