-- Add period start and end date columns to creator_benefit_configs
ALTER TABLE public.creator_benefit_configs 
ADD COLUMN period_start_date timestamp with time zone,
ADD COLUMN period_end_date timestamp with time zone;

-- Create function to check if a benefit config is within active period
CREATE OR REPLACE FUNCTION public.is_benefit_config_active(config_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    CASE 
      WHEN period_start_date IS NULL AND period_end_date IS NULL THEN is_active
      WHEN period_start_date IS NULL THEN (now() <= period_end_date AND is_active)
      WHEN period_end_date IS NULL THEN (now() >= period_start_date AND is_active)
      ELSE (now() >= period_start_date AND now() <= period_end_date AND is_active)
    END
  FROM public.creator_benefit_configs
  WHERE id = config_id;
$function$;

-- Update the song publish benefit trigger to check period dates
CREATE OR REPLACE FUNCTION public.add_song_publish_benefit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  benefit_config RECORD;
BEGIN
  -- Only process if song is being published (is_public = true)
  IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
    -- Get benefit configuration for this creator
    SELECT * INTO benefit_config
    FROM public.creator_benefit_configs
    WHERE creator_id = NEW.user_id 
    AND is_production = true
    LIMIT 1;
    
    -- Check if configuration exists, benefit > 0, and is within active period
    IF benefit_config.id IS NOT NULL 
       AND benefit_config.benefit_per_song_publish > 0 
       AND public.is_benefit_config_active(benefit_config.id) THEN
      INSERT INTO public.creator_benefits (
        creator_id,
        benefit_type,
        amount,
        song_id,
        is_production
      ) VALUES (
        NEW.user_id,
        'song_publish',
        benefit_config.benefit_per_song_publish,
        NEW.id,
        NEW.is_production
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the library add benefit trigger to check period dates
CREATE OR REPLACE FUNCTION public.add_library_add_benefit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  benefit_config RECORD;
  song_creator_id UUID;
BEGIN
  -- Get the song creator ID
  SELECT user_id INTO song_creator_id
  FROM public.songs
  WHERE id = NEW.song_id
  LIMIT 1;
  
  -- Get benefit configuration for the song creator
  SELECT * INTO benefit_config
  FROM public.creator_benefit_configs
  WHERE creator_id = song_creator_id 
  AND is_production = true
  LIMIT 1;
  
  -- Check if configuration exists, benefit > 0, and is within active period
  IF benefit_config.id IS NOT NULL 
     AND benefit_config.benefit_per_library_add > 0 
     AND public.is_benefit_config_active(benefit_config.id) THEN
    INSERT INTO public.creator_benefits (
      creator_id,
      benefit_type,
      amount,
      song_id,
      added_by_user_id,
      is_production
    ) VALUES (
      song_creator_id,
      'library_add',
      benefit_config.benefit_per_library_add,
      NEW.song_id,
      NEW.user_id,
      NEW.is_production
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create function to automatically deactivate expired benefit configs
CREATE OR REPLACE FUNCTION public.deactivate_expired_benefit_configs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Deactivate configs where period_end_date has passed
  UPDATE public.creator_benefit_configs 
  SET is_active = false, updated_at = now()
  WHERE period_end_date IS NOT NULL 
  AND period_end_date < now() 
  AND is_active = true;
END;
$function$;