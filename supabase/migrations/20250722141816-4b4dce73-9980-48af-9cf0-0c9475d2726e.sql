-- Clean up the corrupted Man in the Mirror song data and recreate proper arrangement structure

-- First, delete all existing arrangements for this song
DELETE FROM public.arrangements WHERE song_id = 'b1ca1ab5-edf0-44ce-88d9-7af303e891b9';

-- Now create the proper arrangement structure based on the original song structure
-- Insert arrangements that properly map to individual sections
INSERT INTO public.arrangements (song_id, section_id, position, notes, repeat_count)
VALUES 
  -- Position 1: Intro
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', 'd123a8b1-8d5d-442f-9d97-c96f2ee64e56', 1, '- First Drum 4 Bars\n- All In', 1),
  
  -- Position 2: Verse
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', '3e34dec3-354f-4075-a874-3d08117040fd', 2, NULL, 1),
  
  -- Position 3: Prechorus
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', 'd0f73c72-1d59-42ea-865a-ea1eb03e875b', 3, NULL, 1),
  
  -- Position 4: Chorus
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', 'a9ac639e-ca37-4c4c-b3fb-13fdc0a87dba', 4, NULL, 1),
  
  -- Position 5: Intro 2
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', 'a017d319-3479-454b-aa8b-dc7bf43a5411', 5, NULL, 1),
  
  -- Position 6: Verse 2
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', '41edb53c-d98e-4513-80de-63c6bf60a775', 6, NULL, 1),
  
  -- Position 7: Prechorus 2
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', '339eb20a-38e2-46e0-ac97-b7509fcb93e6', 7, NULL, 1),
  
  -- Position 8: Chorus 2
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', 'b916f370-67f9-4a36-8322-7331739c3c0a', 8, NULL, 1),
  
  -- Position 9: Intro 3
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', '21f1f3b5-4e1b-40cf-8dd9-120b131a8cda', 9, NULL, 1),
  
  -- Position 10: Interlude
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', '9fc0e675-eb57-4ac1-b599-1ed334c51403', 10, NULL, 1),
  
  -- Position 11: Chorus 3
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', 'c62845e0-0a7a-4ed8-a962-194c1e181520', 11, NULL, 1),
  
  -- Position 12: Outro
  ('b1ca1ab5-edf0-44ce-88d9-7af303e891b9', '817fe445-f829-4fd7-bc6d-d1970f9a4a86', 12, NULL, 1);