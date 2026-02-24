-- Add slug columns for SEO-friendly URLs
ALTER TABLE public.songs ADD COLUMN slug text;
ALTER TABLE public.events ADD COLUMN slug text;  
ALTER TABLE public.setlists ADD COLUMN slug text;

-- Create unique indexes for slugs
CREATE UNIQUE INDEX idx_songs_slug ON public.songs(slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX idx_events_slug ON public.events(slug) WHERE slug IS NOT NULL;  
CREATE UNIQUE INDEX idx_setlists_slug ON public.setlists(slug) WHERE slug IS NOT NULL;

-- Function to generate SEO-friendly slugs
CREATE OR REPLACE FUNCTION public.generate_seo_slug(title_param text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
BEGIN
  -- Convert title to slug format: lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(trim(regexp_replace(title_param, '[^a-zA-Z0-9\s-]', '', 'g')));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  -- Ensure slug is not empty
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'item';
  END IF;
  
  -- Limit length to 60 characters for SEO
  IF length(base_slug) > 60 THEN
    base_slug := left(base_slug, 60);
    base_slug := trim(base_slug, '-');
  END IF;
  
  RETURN base_slug;
END;
$$;

-- Function to generate unique slug for songs
CREATE OR REPLACE FUNCTION public.generate_unique_song_slug(title_param text, song_id_param uuid DEFAULT NULL)
RETURNS text  
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := public.generate_seo_slug(title_param);
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS(
    SELECT 1 FROM public.songs 
    WHERE slug = final_slug 
    AND (song_id_param IS NULL OR id != song_id_param)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Function to generate unique slug for events
CREATE OR REPLACE FUNCTION public.generate_unique_event_slug(title_param text, event_id_param uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql  
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := public.generate_seo_slug(title_param);
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS(
    SELECT 1 FROM public.events 
    WHERE slug = final_slug 
    AND (event_id_param IS NULL OR id != event_id_param)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Function to generate unique slug for setlists  
CREATE OR REPLACE FUNCTION public.generate_unique_setlist_slug(name_param text, setlist_id_param uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := public.generate_seo_slug(name_param);
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS(
    SELECT 1 FROM public.setlists 
    WHERE slug = final_slug 
    AND (setlist_id_param IS NULL OR id != setlist_id_param)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Trigger functions to auto-generate slugs
CREATE OR REPLACE FUNCTION public.generate_song_slug_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug on insert or when title changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    NEW.slug := public.generate_unique_song_slug(NEW.title, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_event_slug_trigger()
RETURNS TRIGGER  
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug on insert or when title changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    NEW.slug := public.generate_unique_event_slug(NEW.title, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_setlist_slug_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql  
AS $$
BEGIN
  -- Generate slug on insert or when name changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.name != NEW.name) THEN
    NEW.slug := public.generate_unique_setlist_slug(NEW.name, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER songs_generate_slug_trigger
  BEFORE INSERT OR UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_song_slug_trigger();

CREATE TRIGGER events_generate_slug_trigger  
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_event_slug_trigger();

CREATE TRIGGER setlists_generate_slug_trigger
  BEFORE INSERT OR UPDATE ON public.setlists
  FOR EACH ROW  
  EXECUTE FUNCTION public.generate_setlist_slug_trigger();

-- Backfill slugs for existing records
UPDATE public.songs 
SET slug = public.generate_unique_song_slug(title, id)
WHERE slug IS NULL;

UPDATE public.events
SET slug = public.generate_unique_event_slug(title, id) 
WHERE slug IS NULL;

UPDATE public.setlists
SET slug = public.generate_unique_setlist_slug(name, id)
WHERE slug IS NULL;