-- Add rate limiting table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  ip_address inet,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create rate limiting policies
CREATE POLICY "Service role can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Add server-side library validation function
CREATE OR REPLACE FUNCTION public.validate_library_limit(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_count integer;
  user_limit integer := 10; -- Default limit
  user_subscription record;
BEGIN
  -- Get current library count
  SELECT COUNT(*) INTO current_count
  FROM public.user_library_actions
  WHERE user_id = user_id_param 
  AND action_type = 'add_to_library'
  AND is_production = true;
  
  -- Check if user has active subscription for higher limits
  SELECT s.*, sp.library_limit INTO user_subscription
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_id_param 
  AND s.status = 'active'
  AND s.is_production = true
  LIMIT 1;
  
  -- Set limit based on subscription
  IF user_subscription.id IS NOT NULL THEN
    user_limit := COALESCE(user_subscription.library_limit, 10);
  END IF;
  
  -- Return whether user can add more
  RETURN current_count < user_limit;
END;
$$;

-- Add subscription validation function
CREATE OR REPLACE FUNCTION public.validate_user_subscription(user_id_param uuid, feature_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  has_active_sub boolean := false;
  is_trialing boolean := false;
BEGIN
  -- Check for active subscription
  SELECT EXISTS(
    SELECT 1 
    FROM public.subscriptions 
    WHERE user_id = user_id_param 
    AND status = 'active'
    AND is_production = true
    AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO has_active_sub;
  
  -- Check for active trial
  SELECT EXISTS(
    SELECT 1 
    FROM public.subscriptions 
    WHERE user_id = user_id_param 
    AND is_trial = true
    AND trial_end > now()
    AND is_production = true
  ) INTO is_trialing;
  
  -- Feature-specific validation
  CASE feature_name
    WHEN 'library_access' THEN
      RETURN has_active_sub OR is_trialing;
    WHEN 'export_pdf' THEN
      RETURN has_active_sub;
    WHEN 'youtube_import' THEN
      RETURN has_active_sub OR is_trialing;
    ELSE
      RETURN has_active_sub;
  END CASE;
END;
$$;

-- Add content sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_user_content(content_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
BEGIN
  -- Remove potentially dangerous HTML tags and scripts
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(content_text, '<script[^>]*>.*?</script>', '', 'gi'),
        '<iframe[^>]*>.*?</iframe>', '', 'gi'
      ),
      '<object[^>]*>.*?</object>', '', 'gi'
    ),
    '<embed[^>]*>', '', 'gi'
  );
END;
$$;

-- Add trigger to sanitize content on songs table
CREATE OR REPLACE FUNCTION public.sanitize_song_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.title = public.sanitize_user_content(NEW.title);
  NEW.artist = COALESCE(public.sanitize_user_content(NEW.artist), NEW.artist);
  NEW.notes = COALESCE(public.sanitize_user_content(NEW.notes), NEW.notes);
  RETURN NEW;
END;
$$;

CREATE TRIGGER sanitize_song_content_trigger
  BEFORE INSERT OR UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_song_content();

-- Add trigger to sanitize content on song_sections table
CREATE OR REPLACE FUNCTION public.sanitize_section_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.name = COALESCE(public.sanitize_user_content(NEW.name), NEW.name);
  NEW.lyrics = COALESCE(public.sanitize_user_content(NEW.lyrics), NEW.lyrics);
  NEW.chords = COALESCE(public.sanitize_user_content(NEW.chords), NEW.chords);
  RETURN NEW;
END;
$$;

CREATE TRIGGER sanitize_section_content_trigger
  BEFORE INSERT OR UPDATE ON public.song_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_section_content();

-- Update user_library_actions policies to include server-side validation
DROP POLICY IF EXISTS "Users can insert their own library actions" ON public.user_library_actions;

CREATE POLICY "Users can insert their own library actions" 
ON public.user_library_actions 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    action_type != 'add_to_library' 
    OR public.validate_library_limit(auth.uid())
  )
);