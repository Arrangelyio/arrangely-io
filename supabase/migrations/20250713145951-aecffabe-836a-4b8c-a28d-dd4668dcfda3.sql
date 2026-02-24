-- Update the trigger function to handle new profile fields
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