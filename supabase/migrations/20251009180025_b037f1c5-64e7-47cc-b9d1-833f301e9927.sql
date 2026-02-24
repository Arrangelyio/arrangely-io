-- Add interactive exercises to the sample lesson
DO $$
DECLARE
  v_lesson_id uuid;
  v_module_id uuid;
  v_content_id uuid;
BEGIN
  -- Get the lesson
  SELECT id INTO v_lesson_id 
  FROM lessons 
  WHERE title = 'Complete Piano Basics Course' 
  LIMIT 1;

  IF v_lesson_id IS NULL THEN
    RAISE NOTICE 'Lesson not found';
    RETURN;
  END IF;

  -- Get Module 2 (Basic Scales)
  SELECT id INTO v_module_id
  FROM lesson_modules
  WHERE lesson_id = v_lesson_id
  AND title LIKE '%Scales%'
  LIMIT 1;

  IF v_module_id IS NOT NULL THEN
    -- Add Interactive Chord Chart exercise
    INSERT INTO lesson_content (
      module_id, 
      title, 
      content_type, 
      order_index, 
      is_preview, 
      duration_minutes, 
      content_data
    ) VALUES (
      v_module_id,
      'Interactive: Play Along C-F-G',
      'chord_chart',
      3,
      false,
      8,
      jsonb_build_object(
        'chords', jsonb_build_array(
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 1),
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 2),
          jsonb_build_object('name', 'F', 'duration', 4, 'position', 3),
          jsonb_build_object('name', 'F', 'duration', 4, 'position', 4),
          jsonb_build_object('name', 'G', 'duration', 4, 'position', 5),
          jsonb_build_object('name', 'G', 'duration', 4, 'position', 6),
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 7),
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 8)
        ),
        'tempo', 90,
        'difficulty', 2
      )
    ) RETURNING id INTO v_content_id;

    -- Create the exercise record
    INSERT INTO interactive_exercises (
      content_id,
      exercise_type,
      exercise_data,
      difficulty,
      completion_criteria
    ) VALUES (
      v_content_id,
      'chord_chart',
      jsonb_build_object(
        'chords', jsonb_build_array(
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 1),
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 2),
          jsonb_build_object('name', 'F', 'duration', 4, 'position', 3),
          jsonb_build_object('name', 'F', 'duration', 4, 'position', 4),
          jsonb_build_object('name', 'G', 'duration', 4, 'position', 5),
          jsonb_build_object('name', 'G', 'duration', 4, 'position', 6),
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 7),
          jsonb_build_object('name', 'C', 'duration', 4, 'position', 8)
        ),
        'tempo', 90
      ),
      2,
      jsonb_build_object('min_accuracy', 70)
    );

    -- Add Rhythm Training exercise  
    INSERT INTO lesson_content (
      module_id,
      title,
      content_type,
      order_index,
      is_preview,
      duration_minutes,
      content_data
    ) VALUES (
      v_module_id,
      'Rhythm Training: Quarter Notes',
      'interactive_exercise',
      4,
      false,
      6,
      jsonb_build_object(
        'exercise_type', 'rhythm_trainer',
        'tempo', 100,
        'time_signature', '4/4',
        'pattern', jsonb_build_array(1, 0, 1, 0, 1, 0, 1, 0),
        'measures', 4,
        'difficulty', 1
      )
    ) RETURNING id INTO v_content_id;

    -- Create the rhythm exercise record
    INSERT INTO interactive_exercises (
      content_id,
      exercise_type,
      exercise_data,
      difficulty,
      completion_criteria
    ) VALUES (
      v_content_id,
      'rhythm_trainer',
      jsonb_build_object(
        'tempo', 100,
        'time_signature', '4/4',
        'pattern', jsonb_build_array(1, 0, 1, 0, 1, 0, 1, 0),
        'measures', 4
      ),
      1,
      jsonb_build_object('min_accuracy', 75)
    );
  END IF;

  RAISE NOTICE 'Added interactive exercises to lesson';
END $$;