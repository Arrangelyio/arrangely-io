
-- Remove the enum type constraints and change columns to TEXT
ALTER TABLE public.profiles 
ALTER COLUMN musical_role TYPE TEXT,
ALTER COLUMN usage_context TYPE TEXT,
ALTER COLUMN experience_level TYPE TEXT;

-- Update the trigger function to remove enum casting
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
    NEW.raw_user_meta_data ->> 'musical_role',
    NEW.raw_user_meta_data ->> 'usage_context',
    NEW.raw_user_meta_data ->> 'experience_level',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'instruments' IS NOT NULL 
      THEN string_to_array(replace(replace(NEW.raw_user_meta_data ->> 'instruments', '[', ''), ']', ''), ',')
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

-- Drop the enum types (optional - only if no other tables use them)
DROP TYPE IF EXISTS public.musical_role_type CASCADE;
DROP TYPE IF EXISTS public.usage_context_type CASCADE;
DROP TYPE IF EXISTS public.experience_level_type CASCADE;
