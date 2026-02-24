-- Insert sample lesson data with correct column names
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
  learning_outcomes
) VALUES (
  (SELECT user_id FROM profiles WHERE role = 'creator' OR role = 'admin' LIMIT 1),
  'Complete Piano Basics Course',
  'Master the fundamentals of piano playing. Learn scales, chords, and basic songs - perfect for beginners!',
  'instrument',
  'beginner',
  'video',
  120,
  'published',
  0,
  true,
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
  now(),
  ARRAY['Learn proper hand position', 'Master C major scale', 'Play basic chords', 'Perform your first song']
) ON CONFLICT DO NOTHING;

-- Create modules and content
DO $$
DECLARE
  v_lesson_id uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid;
BEGIN
  SELECT id INTO v_lesson_id FROM lessons WHERE title = 'Complete Piano Basics Course' LIMIT 1;
  IF v_lesson_id IS NULL THEN RETURN; END IF;

  -- Module 1: Introduction (3 preview lessons)
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Introduction to Piano', 'Get started with basics', 0) RETURNING id INTO v_m1;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_m1, 'Welcome to Piano Basics', 'video', '/videos/piano-lesson-sample.mp4', 0, true, false, 4),
    (v_m1, 'Understanding Piano Keys', 'video', '/videos/piano-lesson-sample.mp4', 1, true, false, 4);

  INSERT INTO lesson_content (module_id, title, content_type, order_index, is_preview, duration_minutes, content_data)
  VALUES (v_m1, 'Proper Hand Position', 'text', 2, true, 5, '{"text": "<h2>Proper Hand Position</h2><p>Key points: curve fingers naturally, keep wrists level, thumbs on middle C.</p>"}'::jsonb);

  -- Module 2: Scales (with recording enabled for practice)
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Basic Scales', 'Learn fundamental scales', 1) RETURNING id INTO v_m2;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_m2, 'C Major Scale Tutorial', 'video', '/videos/piano-lesson-sample.mp4', 0, false, true, 4),
    (v_m2, 'Practice: Play C Major', 'video', '/videos/piano-lesson-sample.mp4', 1, false, true, 4),
    (v_m2, 'Finger Exercises', 'video', '/videos/piano-lesson-sample.mp4', 2, false, false, 4);

  -- Module 3: Chords
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Basic Chords', 'Master essential chords', 2) RETURNING id INTO v_m3;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_m3, 'Understanding Triads', 'video', '/videos/piano-lesson-sample.mp4', 0, false, false, 4),
    (v_m3, 'C, F, G Chords', 'video', '/videos/piano-lesson-sample.mp4', 1, false, true, 4),
    (v_m3, 'Chord Progressions', 'video', '/videos/piano-lesson-sample.mp4', 2, false, false, 4);

  -- Module 4: First Song (recording enabled for performances)
  INSERT INTO lesson_modules (lesson_id, title, description, order_index)
  VALUES (v_lesson_id, 'Your First Song', 'Play a complete song', 3) RETURNING id INTO v_m4;

  INSERT INTO lesson_content (module_id, title, content_type, video_url, order_index, is_preview, enable_camera_recording, duration_minutes)
  VALUES 
    (v_m4, 'Twinkle Twinkle Intro', 'video', '/videos/piano-lesson-sample.mp4', 0, false, false, 4),
    (v_m4, 'Right Hand Melody', 'video', '/videos/piano-lesson-sample.mp4', 1, false, true, 4),
    (v_m4, 'Adding Left Hand', 'video', '/videos/piano-lesson-sample.mp4', 2, false, true, 4),
    (v_m4, 'Final Performance', 'video', '/videos/piano-lesson-sample.mp4', 3, false, true, 4);
END $$;