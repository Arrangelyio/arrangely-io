-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  otp_code text NOT NULL,
  user_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true
);

-- Create index for faster email lookups
CREATE INDEX idx_otp_verifications_email ON public.otp_verifications(email);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for OTP verification access (public access for verification)
CREATE POLICY "Allow OTP verification for valid sessions" 
ON public.otp_verifications 
FOR SELECT 
USING (expires_at > now() AND is_verified = false);

-- Create policy for inserting OTP records (public access for registration)
CREATE POLICY "Allow OTP creation" 
ON public.otp_verifications 
FOR INSERT 
WITH CHECK (true);

-- Create policy for updating OTP records (for verification)
CREATE POLICY "Allow OTP verification updates" 
ON public.otp_verifications 
FOR UPDATE 
USING (expires_at > now());

-- Function to clean up expired OTP records
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.otp_verifications 
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;