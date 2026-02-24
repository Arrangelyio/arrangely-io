-- Fix rate_limits table RLS policies to allow proper access

-- Drop existing overly restrictive policy
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Allow users to view their own rate limit status
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own rate limit records
CREATE POLICY "Users can insert their own rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own rate limit records
CREATE POLICY "Users can update their own rate limits" 
ON public.rate_limits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow service role to manage all rate limits
CREATE POLICY "Service role can manage all rate limits" 
ON public.rate_limits 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Allow system operations (for triggers and functions)
CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (auth.uid() IS NULL OR current_setting('role') = 'authenticator');