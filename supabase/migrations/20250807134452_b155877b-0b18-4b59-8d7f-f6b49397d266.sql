-- Fix rate_limits table to allow unauthenticated access for rate limiting operations

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert their own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can insert rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Authenticated users can insert system rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can update their own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Service role can manage all rate limits" ON public.rate_limits;

-- Allow public access for rate limiting operations (no authentication required)
CREATE POLICY "Public can insert rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can select rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (true);

CREATE POLICY "Public can update rate limits" 
ON public.rate_limits 
FOR UPDATE 
USING (true);

-- Allow service role full access for administrative operations
CREATE POLICY "Service role can manage all rate limits" 
ON public.rate_limits 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Allow DELETE only for service role (for cleanup operations)
CREATE POLICY "Service role can delete rate limits" 
ON public.rate_limits 
FOR DELETE 
USING (current_setting('role') = 'service_role');