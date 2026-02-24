-- Fix security issue: Set search_path for generate_creator_slug function
CREATE OR REPLACE FUNCTION public.generate_creator_slug(display_name_param text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert display name to slug format
  base_slug := lower(trim(regexp_replace(display_name_param, '[^a-zA-Z0-9\s]', '', 'g')));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'creator';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS(SELECT 1 FROM public.profiles WHERE creator_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;