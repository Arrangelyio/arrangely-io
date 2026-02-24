-- Insert sample piano lesson with comprehensive modules and content
INSERT INTO lessons (
  creator_id,
  title,
  description,
  category,
  difficulty_level,
  lesson_type,
  duration_minutes,
  status,
  price,
  is_free,
  cover_image_url,
  published_at,
  is_production,
  learning_outcomes
) VALUES (
  (SELECT user_id FROM profiles WHERE role IN ('creator', 'admin') LIMIT 1),
  'Complete Piano Basics Course',
  'Master piano fundamentals with this comprehensive course. Learn scales, chords, rhythm, and basic songs. Perfect for absolute beginners!',
  'instrument',
  'beginner',
  'video',
  120,
  'published',
  0,
  true,
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
  now(),
  true,
  ARRAY['Learn proper hand position and posture', 'Master the C major scale', 'Play basic chords (C, F, G)', 'Perform your first complete song']
) ON CONFLICT DO NOTHING;

-- Create modules and content
DO $$
DECLARE
  v_lesson_id uuid;
  v_module1_id uuid;
  v_module2_id uuid;
  v_module3_id uuid;
  v_module4_id uuid;
BEGIN
  SELECT id INTO v_lesson_id 
  FROM lessons 
  WHERE title = 'Complete Piano Basics Course' 
  AND is_production = true 
  LIMIT 1;

  IF v_lesson_id IS NULL THEN
    RAISE NOTICE 'Please create a creator/admin user first';
    RETURN;
  END IF;

  -- Module 1: Introduction (3 preview lessons)
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Introduction to Piano', 'Get started with piano basics', 0)
  RETURNING id INTO v_module1_id;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_module1_id, 'Welcome to Piano Basics', 'video', '/videos/piano-lesson-sample.mp4', 0, true, false, 4),
    (v_module1_id, 'Understanding Piano Keys', 'video', '/videos/piano-lesson-sample.mp4', 1, true, false, 4);

  INSERT INTO lesson_content (module_id, title, content_type, order_index, is_preview, duration_minutes, content_data)
  VALUES (
    v_module1_id, 'Proper Hand Position', 'text', 2, true, 5,
    '{"text": "<h2>Proper Hand Position</h2><p>Learning the correct hand position is crucial for developing good piano technique. Key points:</p><ul><li>Curve your fingers naturally, as if holding a small ball</li><li>Keep your wrists level with your hands</li><li>Position your thumbs on middle C</li><li>Maintain relaxed shoulders</li><li>Sit at the right height - forearms parallel to floor</li></ul><p><strong>Practice daily for 5-10 minutes before playing.</strong></p>"}'::jsonb
  );

  -- Module 2: Basic Scales (with recording enabled for practice)
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Basic Scales and Exercises', 'Learn fundamental scales and finger exercises', 1)
  RETURNING id INTO v_module2_id;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_module2_id, 'C Major Scale Tutorial', 'video', '/videos/piano-lesson-sample.mp4', 0, false, true, 4),
    (v_module2_id, 'Practice: Play C Major Scale', 'video', '/videos/piano-lesson-sample.mp4', 1, false, true, 4),
    (v_module2_id, 'Five Finger Exercises', 'video', '/videos/piano-lesson-sample.mp4', 2, false, false, 4);

  -- Module 3: Basic Chords
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Basic Chords', 'Master essential piano chords', 2)
  RETURNING id INTO v_module3_id;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_module3_id, 'Understanding Triads', 'video', '/videos/piano-lesson-sample.mp4', 0, false, false, 4),
    (v_module3_id, 'C, F, and G Chords', 'video', '/videos/piano-lesson-sample.mp4', 1, false, true, 4),
    (v_module3_id, 'Chord Progressions', 'video', '/videos/piano-lesson-sample.mp4', 2, false, false, 4);

  -- Module 4: Your First Song (with recording for performance evaluation)
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Your First Song', 'Put it all together and play a complete song', 3)
  RETURNING id INTO v_module4_id;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_module4_id, 'Song Intro: Twinkle Twinkle', 'video', '/videos/piano-lesson-sample.mp4', 0, false, false, 4),
    (v_module4_id, 'Right Hand Melody', 'video', '/videos/piano-lesson-sample.mp4', 1, false, true, 4),
    (v_module4_id, 'Adding Left Hand', 'video', '/videos/piano-lesson-sample.mp4', 2, false, true, 4),
    (v_module4_id, 'Final Performance', 'video', '/videos/piano-lesson-sample.mp4', 3, false, true, 4);

  RAISE NOTICE 'Sample lesson created: 4 modules with 14 content items (6 with recording enabled)';
END $$;