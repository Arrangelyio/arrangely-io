-- Add creator slug to profiles table for SEO-friendly URLs
ALTER TABLE public.profiles 
ADD COLUMN creator_slug text UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_creator_slug ON public.profiles(creator_slug);

-- Create function to generate slug from display name
CREATE OR REPLACE FUNCTION public.generate_creator_slug(display_name_param text)
RETURNS text
LANGUAGE plpgsql
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

-- Populate existing creators with slugs
UPDATE public.profiles 
SET creator_slug = public.generate_creator_slug(COALESCE(display_name, 'creator-' || SUBSTRING(user_id::text, 1, 8)))
WHERE creator_type IN ('creator_professional', 'creator_arrangely') 
AND creator_slug IS NULL;