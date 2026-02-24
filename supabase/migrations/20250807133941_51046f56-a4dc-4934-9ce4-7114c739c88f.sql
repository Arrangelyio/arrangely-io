-- Fix rate_limits INSERT policies to handle both user and system operations

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert their own rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can manage rate limits" ON public.rate_limits;

-- Allow users to insert their own rate limits (when user_id matches auth.uid())
CREATE POLICY "Users can insert their own rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

-- Allow system operations for rate limiting (when user_id is NULL or for system roles)
CREATE POLICY "System can insert rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (
  user_id IS NULL OR 
  current_setting('role') = 'service_role' OR 
  current_setting('role') = 'authenticator' OR
  auth.uid() IS NULL
);

-- Allow system operations for all other commands
CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (
  auth.uid() IS NULL OR 
  current_setting('role') = 'service_role' OR 
  current_setting('role') = 'authenticator'
);

-- Allow authenticated users to insert rate limits for system tracking
CREATE POLICY "Authenticated users can insert system rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);