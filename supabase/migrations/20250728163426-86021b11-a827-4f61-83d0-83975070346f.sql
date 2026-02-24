-- Add a library action for KECAPLAH DAN LIHATLAH song to show correct count
INSERT INTO public.user_library_actions (
  user_id,
  song_id,
  action_type,
  is_production
) VALUES (
  '5e4e63f4-0a14-4f0e-aea7-ecb2f3d383a2',
  '0eb445b2-85fe-4b07-8a4f-0d9829eaa783',
  'add_to_library',
  true
);

-- This will also trigger the library add benefit for the creator
-- since the trigger should automatically add the benefit