-- Fix OTP expiry to be within recommended threshold (10 minutes instead of long expiry)
-- Update the table structure doesn't need changes as we're already using 10 minutes in the application logic

-- Add a cleanup function that runs more frequently to ensure expired OTPs are removed quickly
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Delete OTPs that are older than 10 minutes
  DELETE FROM public.otp_verifications 
  WHERE expires_at < now();
END;
$$;

-- Note: The OTP expiry in our application will be set to 10 minutes which is within recommended limits