
-- Create enum types for musical roles, usage contexts, and experience levels
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

-- Update the profiles table to use the new enum types (if columns already exist)
-- If the columns don't exist yet, this will add them
DO $$ 
BEGIN
  -- Check if the columns exist and add them if they don't
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'musical_role') THEN
    ALTER TABLE public.profiles ADD COLUMN musical_role musical_role_type;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'usage_context') THEN
    ALTER TABLE public.profiles ADD COLUMN usage_context usage_context_type;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'experience_level') THEN
    ALTER TABLE public.profiles ADD COLUMN experience_level experience_level_type;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'instruments') THEN
    ALTER TABLE public.profiles ADD COLUMN instruments TEXT[];
  END IF;
END $$;

-- Update the trigger function to handle the new profile fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name,
    musical_role,
    usage_context,
    experience_level,
    instruments
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    (NEW.raw_user_meta_data ->> 'musical_role')::musical_role_type,
    (NEW.raw_user_meta_data ->> 'usage_context')::usage_context_type,
    (NEW.raw_user_meta_data ->> 'experience_level')::experience_level_type,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'instruments' IS NOT NULL 
      THEN string_to_array(replace(replace(NEW.raw_user_meta_data ->> 'instruments', '[', ''), ']', ''), ',')
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;
