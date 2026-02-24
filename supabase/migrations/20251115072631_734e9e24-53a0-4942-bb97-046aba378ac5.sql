-- Fix search_path for update_push_token_updated_at function
DROP FUNCTION IF EXISTS update_push_token_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_push_token_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_push_token_timestamp
  BEFORE UPDATE ON public.push_notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_updated_at();