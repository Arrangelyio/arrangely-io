-- Insert Grand Launching Event Arrangely for testing
INSERT INTO public.events (
  title,
  description,
  date,
  start_time,
  end_time,
  location,
  address,
  price,
  max_capacity,
  current_registrations,
  speaker_name,
  speaker_bio,
  status,
  is_production
) VALUES (
  'Grand Launching Event Arrangely',
  'Join us for the grand launching of Arrangely! Experience the future of worship music arrangement with live demonstrations, workshops, and performances by renowned artists. Discover how Arrangely is revolutionizing the way musicians create, share, and collaborate on worship music.',
  '2025-09-17',
  '16:00',
  '18:00',
  'Jakarta Convention Center',
  'Jl. Gatot Subroto, Jakarta Pusat, DKI Jakarta',
  0,
  200,
  0,
  'Echa Soemantri & Friends, Barry Likumahuwa',
  'Echa Soemantri is a renowned Indonesian worship leader and musician, known for his contributions to contemporary Christian music. Barry Likumahuwa is a celebrated bassist and music producer who has worked with many top Indonesian artists. Together with their musical friends, they will showcase the power of Arrangely in live worship arrangements.',
  'active',
  true
);