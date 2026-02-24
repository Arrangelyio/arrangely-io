

-- First, let's make sure the enum types exist (they should from the previous migration)
-- But let's recreate them just in case there was an issue

DROP TYPE IF EXISTS public.musical_role_type CASCADE;
DROP TYPE IF EXISTS public.usage_context_type CASCADE;
DROP TYPE IF EXISTS public.experience_level_type CASCADE;

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

-- Update the trigger function with better error handling and type casting
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
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'musical_role' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'musical_role')::musical_role_type
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'usage_context' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'usage_context')::usage_context_type
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'experience_level' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'experience_level')::experience_level_type
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'instruments' IS NOT NULL 
      THEN string_to_array(replace(replace(NEW.raw_user_meta_data ->> 'instruments', '[', ''), ']', ''), ',')
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

