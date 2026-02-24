-- Fix the Man in the Mirror arrangement structure for the correct song ID
-- Delete existing arrangements that are incomplete
DELETE FROM public.arrangements WHERE song_id = 'f8c0c932-f2ef-4785-b77b-e5bade971345';

-- Recreate proper arrangement structure including Intro 2
INSERT INTO public.arrangements (song_id, section_id, position, notes, repeat_count)
VALUES 
  -- Position 1: Intro
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '6813a04e-418c-4ef2-bc92-05c19bbf757b', 1, '- First Drum 4 Bars\n- All In', 1),
  
  -- Position 2: Verse
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', 'c9edf042-1973-46fc-88a1-8bdeeb2e46f3', 2, NULL, 1),
  
  -- Position 3: Prechorus
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', 'e5dd0bec-20d3-4a15-bad4-4671aa26ec9c', 3, NULL, 1),
  
  -- Position 4: Chorus
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '19993233-dec9-4a07-84ad-0c9ba035c244', 4, NULL, 1),
  
  -- Position 5: Intro 2
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '235c049f-eee2-4123-a510-a71c968ee97b', 5, NULL, 1),
  
  -- Position 6: Verse 2
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', 'd808cbb8-24e3-408c-b712-259427af441e', 6, NULL, 1),
  
  -- Position 7: Prechorus 2
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '0daf3c4d-8cac-41df-b72f-b03fcf5fd56a', 7, NULL, 1),
  
  -- Position 8: Chorus 2
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '08d0e2dd-90f1-416d-9b74-9d30df66c32f', 8, NULL, 1),
  
  -- Position 9: Intro 3
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '098f3027-5164-4e04-b589-0813e029518d', 9, NULL, 1),
  
  -- Position 10: Interlude
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', 'f42fb8a1-e5bb-48a7-99f1-860991eca406', 10, NULL, 1),
  
  -- Position 11: Chorus 3
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '491c623c-d3aa-41fc-9e29-6ac2493c417c', 11, NULL, 1),
  
  -- Position 12: Outro
  ('f8c0c932-f2ef-4785-b77b-e5bade971345', '8d698751-e52a-4ab9-a1bb-b77230c0da87', 12, NULL, 1);