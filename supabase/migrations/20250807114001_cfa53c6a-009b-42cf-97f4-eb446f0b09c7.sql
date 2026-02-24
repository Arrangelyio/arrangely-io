-- Fix function search path issues by updating existing functions
CREATE OR REPLACE FUNCTION public.get_song_library_count(song_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.user_library_actions
  WHERE user_library_actions.song_id = $1;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Delete OTPs that are older than 5 minutes (reduced from 10 for security)
  DELETE FROM public.otp_verifications 
  WHERE expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_song_views(song_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.songs 
  SET views_count = COALESCE(views_count, 0) + 1,
      last_viewed_at = now()
  WHERE id = song_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_song_like_count(song_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.song_likes
  WHERE song_likes.song_id = $1;
$function$;