-- Create security incidents table for monitoring and alerting
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  user_id UUID,
  incident_type TEXT NOT NULL,
  incidents_detected INTEGER DEFAULT 0,
  incident_details JSONB DEFAULT '[]'::jsonb,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Enable RLS on security incidents table
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can access security incidents
CREATE POLICY "Service role can manage security incidents" 
ON public.security_incidents 
FOR ALL 
USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view security incidents" 
ON public.security_incidents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'::user_role
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_incidents_ip_time 
ON public.security_incidents (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_incidents_user_time 
ON public.security_incidents (user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Create cleanup function for old security incidents (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_incidents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.security_incidents 
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Add cleanup for old rate limit records (keep last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
END;
$$;