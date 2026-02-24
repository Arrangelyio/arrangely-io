-- Create trigger to automatically clean up review queue when chords are approved
CREATE OR REPLACE FUNCTION cleanup_approved_review_queue_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- When a review queue item is marked as "approved" or "mapped", 
  -- we can optionally keep it for historical purposes or remove it
  -- For now, we'll keep the record but update the status
  
  -- If the status changed to 'approved' or 'mapped', log it
  IF (OLD.status != NEW.status) AND (NEW.status IN ('approved', 'mapped')) THEN
    -- Update reviewed_at timestamp
    NEW.reviewed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS review_queue_status_update ON public.chord_review_queue;
CREATE TRIGGER review_queue_status_update
  BEFORE UPDATE ON public.chord_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_approved_review_queue_items();