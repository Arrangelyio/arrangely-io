-- Add benefit for the published song that should have triggered automatically
INSERT INTO public.creator_benefits (
  creator_id,
  benefit_type,
  amount,
  song_id,
  is_production
) VALUES (
  '5e4e63f4-0a14-4f0e-aea7-ecb2f3d383a2',
  'song_publish',
  25000,
  '0eb445b2-85fe-4b07-8a4f-0d9829eaa783',
  true
);

-- Add benefit for the library add action that should have triggered automatically
INSERT INTO public.creator_benefits (
  creator_id,
  benefit_type,
  amount,
  song_id,
  added_by_user_id,
  is_production
) VALUES (
  '5e4e63f4-0a14-4f0e-aea7-ecb2f3d383a2',
  'library_add',
  250,
  '2aab4ce7-8c34-4a92-a5ae-a173c6182262',
  '5e4e63f4-0a14-4f0e-aea7-ecb2f3d383a2',
  true
);