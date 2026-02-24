-- Update existing creators with diverse introduction videos
-- We'll assign different specialties and videos to existing creators

-- Update Kevin Senjaya as guitarist
UPDATE public.profiles
SET 
  introduction_video_url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  introduction_title = 'Master Guitar with Kevin',
  introduction_description = 'Learn professional guitar techniques from acoustic to electric. Worship guitar, lead solos, and rhythm fundamentals.',
  bio = 'Professional guitarist with 15+ years of experience in worship music, studio recording, and live performances.'
WHERE display_name = 'Kevin Senjaya'
  AND is_production = true;

-- Update Michael IF as music producer
UPDATE public.profiles
SET 
  introduction_video_url = 'https://www.youtube.com/watch?v=9bZkp7q19f0',
  introduction_title = 'Music Production with Michael',
  introduction_description = 'Professional music production from mixing, mastering, to sound design. Create radio-ready tracks from your home studio.',
  bio = 'Music producer and sound engineer with 10+ years experience. Produced tracks for major artists across Asia.'
WHERE display_name = 'Michael IF'
  AND is_production = true;

-- Update Daniel Prihanto as bassist (simulating Barry Likumahuwa style)
UPDATE public.profiles
SET 
  display_name = 'Barry Likumahuwa',
  introduction_video_url = 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  introduction_title = 'Master Bass with Barry',
  introduction_description = 'Learn professional bass techniques from one of Indonesia''s most renowned bassists. From groove fundamentals to advanced slap techniques.',
  bio = 'Professional bassist with 20+ years of experience. Known for work with top Indonesian artists and unique fingerstyle technique.'
WHERE display_name = 'Daniel Prihanto'
  AND is_production = true;

-- Update Daniel P S P as songwriter (simulating Andre Hermanto)
UPDATE public.profiles
SET 
  display_name = 'Andre Hermanto',
  introduction_video_url = 'https://www.youtube.com/watch?v=YQHsXMglC9A',
  introduction_title = 'Songwriting Secrets with Andre',
  introduction_description = 'Discover the art of writing memorable songs. Learn melody crafting, lyric writing, and how to turn your ideas into hits.',
  bio = 'Award-winning songwriter and composer. Crafted hits for major Indonesian artists and international projects.'
WHERE display_name = 'Daniel P S P'
  AND is_production = true;

-- Update sekecoc kecoc koder kata gw teh as drummer (simulating Joshua Sentosa)
UPDATE public.profiles
SET 
  display_name = 'Joshua Sentosa',
  introduction_video_url = 'https://www.youtube.com/watch?v=d_m4jZ4r1N8',
  introduction_title = 'Drumming Fundamentals with Joshua',
  introduction_description = 'Build solid drumming foundation with proper technique, timing, and groove. From basic beats to complex patterns.',
  bio = 'Professional drummer specializing in gospel, jazz, and contemporary styles. Session musician for top recording artists.'
WHERE display_name = 'sekecoc kecoc koder kata gw teh'
  AND is_production = true;

-- Update fonavog as piano teacher
UPDATE public.profiles
SET 
  display_name = 'Sarah Chen',
  introduction_video_url = 'https://www.youtube.com/watch?v=P16GbhcvHU8',
  introduction_title = 'Piano Mastery with Sarah',
  introduction_description = 'From classical foundations to contemporary worship keys. Learn chord voicings, improvisation, and accompaniment techniques.',
  bio = 'Classical pianist turned contemporary musician. Specializes in teaching piano for worship and modern arrangements.'
WHERE display_name = 'fonavog'
  AND is_production = true;

-- Update lofol as music theory teacher
UPDATE public.profiles
SET 
  display_name = 'Rachel Tan',
  introduction_video_url = 'https://www.youtube.com/watch?v=rgaTLrZGlk0',
  introduction_title = 'Theory Made Simple with Rachel',
  introduction_description = 'Understand music theory in a practical way. From scales and chords to advanced harmony and composition.',
  bio = 'Music theory professor and arranger. Making music theory easy and practical for all musicians.'
WHERE display_name = 'lofol'
  AND is_production = true;

-- Update Arrangely io as vocal coach
UPDATE public.profiles
SET 
  display_name = 'Maria Santos',
  introduction_video_url = 'https://www.youtube.com/watch?v=m3lF2qEA2cw',
  introduction_title = 'Vocal Excellence with Maria',
  introduction_description = 'Develop your voice with proper technique, breath control, and performance skills. Perfect for worship leaders and singers.',
  bio = 'Professional vocal coach with 15+ years experience. Trained hundreds of worship leaders and recording artists.'
WHERE display_name = 'Arrangely io'
  AND is_production = true;

-- Now update lessons to use different creators
DO $$
DECLARE
  kevin_id UUID;
  michael_id UUID;
  barry_id UUID;
  andre_id UUID;
  joshua_id UUID;
  sarah_id UUID;
  rachel_id UUID;
  maria_id UUID;
BEGIN
  -- Get creator IDs by their new names
  SELECT user_id INTO kevin_id FROM public.profiles WHERE display_name = 'Kevin Senjaya' AND is_production = true LIMIT 1;
  SELECT user_id INTO michael_id FROM public.profiles WHERE display_name = 'Michael IF' AND is_production = true LIMIT 1;
  SELECT user_id INTO barry_id FROM public.profiles WHERE display_name = 'Barry Likumahuwa' AND is_production = true LIMIT 1;
  SELECT user_id INTO andre_id FROM public.profiles WHERE display_name = 'Andre Hermanto' AND is_production = true LIMIT 1;
  SELECT user_id INTO joshua_id FROM public.profiles WHERE display_name = 'Joshua Sentosa' AND is_production = true LIMIT 1;
  SELECT user_id INTO sarah_id FROM public.profiles WHERE display_name = 'Sarah Chen' AND is_production = true LIMIT 1;
  SELECT user_id INTO rachel_id FROM public.profiles WHERE display_name = 'Rachel Tan' AND is_production = true LIMIT 1;
  SELECT user_id INTO maria_id FROM public.profiles WHERE display_name = 'Maria Santos' AND is_production = true LIMIT 1;

  -- Update guitar lessons to Kevin
  UPDATE public.lessons
  SET creator_id = kevin_id
  WHERE (title ILIKE '%guitar%' OR description ILIKE '%guitar%')
    AND is_production = true
    AND kevin_id IS NOT NULL;

  -- Update piano lessons to Sarah
  UPDATE public.lessons
  SET creator_id = sarah_id
  WHERE (title ILIKE '%piano%' OR title ILIKE '%keyboard%')
    AND is_production = true
    AND sarah_id IS NOT NULL;

  -- Update songwriting lessons to Andre
  UPDATE public.lessons
  SET creator_id = andre_id
  WHERE category = 'songwriting'
    AND is_production = true
    AND andre_id IS NOT NULL;

  -- Update production lessons to Michael
  UPDATE public.lessons
  SET creator_id = michael_id
  WHERE category = 'production'
    AND is_production = true
    AND michael_id IS NOT NULL;

  -- Update theory lessons to Rachel
  UPDATE public.lessons
  SET creator_id = rachel_id
  WHERE category = 'theory'
    AND is_production = true
    AND rachel_id IS NOT NULL;

  -- Update jazz piano to Sarah (specific case)
  UPDATE public.lessons
  SET creator_id = sarah_id
  WHERE title ILIKE '%jazz piano%'
    AND is_production = true
    AND sarah_id IS NOT NULL;

  -- Update worship leading to Maria if any exist
  UPDATE public.lessons
  SET creator_id = maria_id
  WHERE category = 'worship_leading'
    AND is_production = true
    AND maria_id IS NOT NULL;

END $$;