-- Add security enhancements to event_registrations table
-- Add indexes for better QR code validation performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_qr_code ON public.event_registrations(qr_code);
CREATE INDEX IF NOT EXISTS idx_event_registrations_booking_id ON public.event_registrations(booking_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_check_in ON public.event_registrations(check_in_time) WHERE check_in_time IS NOT NULL;

-- Add a function to generate more secure booking IDs
CREATE OR REPLACE FUNCTION public.generate_secure_booking_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_ids TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a more secure booking ID with timestamp and random components
    booking_ids := 'EVT-' || 
      UPPER(SUBSTRING(gen_random_uuid()::text, 1, 4)) || 
      UPPER(SUBSTRING(gen_random_uuid()::text, 25, 4));
    
    -- Check if this booking ID already exists
    SELECT EXISTS(
      SELECT 1 
      FROM public.event_registrations er
      WHERE er.booking_id = booking_ids
    ) INTO exists_check;
    
    -- If it doesn't exist, we can use it
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN booking_ids;
END;
$$;

-- Add constraint to ensure QR codes are unique
ALTER TABLE public.event_registrations 
ADD CONSTRAINT unique_qr_code UNIQUE (qr_code);

-- Add constraint to ensure booking IDs are unique  
ALTER TABLE public.event_registrations 
ADD CONSTRAINT unique_booking_id UNIQUE (booking_id);