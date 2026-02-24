-- Update the is_live_preview_context function to properly detect live preview mode
-- This function should only return true during actual live preview sessions

CREATE OR REPLACE FUNCTION public.is_live_preview_context()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  -- Check if the current request is coming from a live preview context
  -- We can use the request headers or other context clues to determine this
  SELECT 
    CASE 
      WHEN current_setting('request.headers', true)::json->>'referer' LIKE '%live-preview%' 
        OR current_setting('request.headers', true)::json->>'referer' LIKE '%setlist-performance%'
      THEN true
      ELSE false
    END;
$function$;