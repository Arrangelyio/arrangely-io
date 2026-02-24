
-- Create the missing enum types that are referenced in the handle_new_user function
CREATE TYPE public.musical_role_type AS ENUM (
  'keyboardist',
  'guitarist', 
  'bassist',
  'drummer',
  'vocalist',
  'worship_leader',
  'music_director',
  'sound_engineer',
  'other'
);

CREATE TYPE public.usage_context_type AS ENUM (
  'church',
  'event',
  'cafe', 
  'concert',
  'studio',
  'personal',
  'education',
  'other'
);

CREATE TYPE public.experience_level_type AS ENUM (
  'beginner',
  'intermediate',
  'advanced',
  'professional'
);
