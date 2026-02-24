-- Update the is_live_preview_context function to exclude setlist-performance pages
-- The authentication policy should only apply to the setlist planner tab in /library, not setlist-performance

CREATE OR REPLACE FUNCTION public.is_live_preview_context()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  -- Check if the current request is coming from a live preview context
  -- Exclude setlist-performance pages as they should have full access
  SELECT 
    CASE 
      WHEN current_setting('request.headers', true)::json->>'referer' LIKE '%live-preview%' 
        AND current_setting('request.headers', true)::json->>'referer' NOT LIKE '%setlist-performance%'
      THEN true
      ELSE false
    END;
$function$;