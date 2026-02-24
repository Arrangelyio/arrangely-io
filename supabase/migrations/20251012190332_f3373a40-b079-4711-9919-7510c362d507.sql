-- Add sample enrollment data for testing (user: kevinsenjaya72@gmail.com)
-- This is test data to demonstrate the progress tracking features

-- Insert enrollments with various states
INSERT INTO lesson_enrollments (lesson_id, user_id, enrolled_at, completed_at, progress_percentage, last_accessed_at)
VALUES
  -- Completed lessons
  ('851f9ac2-ecf3-48fc-8520-f80048537319', '476e3eb9-cfe3-4a6b-ae24-f7dd8264d145', 
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days', 100, NOW() - INTERVAL '5 days'),
  
  ('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', '476e3eb9-cfe3-4a6b-ae24-f7dd8264d145', 
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days', 100, NOW() - INTERVAL '3 days'),
  
  -- In progress lessons
  ('298d9b9e-3999-4c09-a1b0-c72a687decac', '476e3eb9-cfe3-4a6b-ae24-f7dd8264d145', 
   NOW() - INTERVAL '20 days', NULL, 65, NOW() - INTERVAL '1 day'),
  
  ('4491e347-499a-4cea-a83a-729feb6357e0', '476e3eb9-cfe3-4a6b-ae24-f7dd8264d145', 
   NOW() - INTERVAL '15 days', NULL, 40, NOW() - INTERVAL '2 days'),
  
  ('7c431121-de7e-4742-ac60-46b0e414ad5a', '476e3eb9-cfe3-4a6b-ae24-f7dd8264d145', 
   NOW() - INTERVAL '10 days', NULL, 20, NOW() - INTERVAL '3 days'),
  
  -- Just started
  ('d9385d21-c424-4a4e-8b10-018cd27c2164', '476e3eb9-cfe3-4a6b-ae24-f7dd8264d145', 
   NOW() - INTERVAL '2 days', NULL, 5, NOW())
ON CONFLICT (user_id, lesson_id) DO UPDATE SET
  progress_percentage = EXCLUDED.progress_percentage,
  completed_at = EXCLUDED.completed_at,
  last_accessed_at = EXCLUDED.last_accessed_at;