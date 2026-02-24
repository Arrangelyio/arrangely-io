-- Server-side rate limiting for database operations
-- Create enhanced rate limiting function for database operations
CREATE OR REPLACE FUNCTION public.check_database_rate_limit(
  user_id_param UUID,
  operation_type TEXT,
  table_name TEXT DEFAULT NULL,
  ip_address INET DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  rate_limit_key TEXT;
  current_count INTEGER;
  rate_limit INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
  rate_limit_record RECORD;
BEGIN
  -- Create rate limit key
  rate_limit_key := CASE 
    WHEN table_name IS NOT NULL THEN operation_type || ':' || table_name
    ELSE operation_type
  END;
  
  -- Set rate limits based on operation type and table
  rate_limit := CASE 
    WHEN operation_type = 'SELECT' THEN 500  -- 500 selects per minute
    WHEN operation_type = 'INSERT' THEN 100  -- 100 inserts per minute
    WHEN operation_type = 'UPDATE' THEN 200  -- 200 updates per minute
    WHEN operation_type = 'DELETE' THEN 50   -- 50 deletes per minute
    WHEN operation_type = 'RPC' THEN 100     -- 100 RPC calls per minute
    ELSE 100
  END;
  
  -- Adjust limits for sensitive tables
  IF table_name IN ('users', 'auth', 'profiles') THEN
    rate_limit := rate_limit / 2;
  END IF;
  
  -- Calculate window start (1 minute window)
  window_start := now() - INTERVAL '1 minute';
  
  -- Check current rate limit
  SELECT request_count, window_start as ws INTO rate_limit_record
  FROM public.rate_limits
  WHERE user_id = user_id_param
  AND endpoint = rate_limit_key
  AND window_start >= window_start
  ORDER BY window_start DESC
  LIMIT 1;
  
  current_count := COALESCE(rate_limit_record.request_count, 0);
  
  -- Check if rate limit exceeded
  IF current_count >= rate_limit THEN
    -- Log security incident for excessive database access
    INSERT INTO public.security_incidents (
      user_id,
      ip_address,
      incident_type,
      severity,
      details,
      is_production
    ) VALUES (
      user_id_param,
      ip_address,
      'database_rate_limit_exceeded',
      'medium',
      jsonb_build_object(
        'operation', operation_type,
        'table', table_name,
        'current_count', current_count,
        'limit', rate_limit
      ),
      public.get_current_environment()
    );
    
    RETURN FALSE;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO public.rate_limits (
    user_id,
    endpoint,
    ip_address,
    request_count,
    window_start,
    is_production
  ) VALUES (
    user_id_param,
    rate_limit_key,
    ip_address,
    1,
    now(),
    public.get_current_environment()
  )
  ON CONFLICT (user_id, endpoint, window_start) 
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    ip_address = COALESCE(EXCLUDED.ip_address, rate_limits.ip_address);
  
  RETURN TRUE;
END;
$$;

-- Create function to get client IP from request headers
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS INET
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT CASE 
    WHEN current_setting('request.headers', true)::json->>'x-forwarded-for' IS NOT NULL 
    THEN (current_setting('request.headers', true)::json->>'x-forwarded-for')::inet
    WHEN current_setting('request.headers', true)::json->>'x-real-ip' IS NOT NULL 
    THEN (current_setting('request.headers', true)::json->>'x-real-ip')::inet
    ELSE '127.0.0.1'::inet
  END;
$$;

-- Create trigger function for rate limiting database operations
CREATE OR REPLACE FUNCTION public.database_rate_limit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_user_id UUID;
  client_ip INET;
  operation_type TEXT;
  rate_limit_passed BOOLEAN;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Skip rate limiting for system operations or when no user
  IF current_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get client IP
  BEGIN
    client_ip := public.get_client_ip();
  EXCEPTION WHEN OTHERS THEN
    client_ip := '127.0.0.1'::inet;
  END;
  
  -- Determine operation type
  operation_type := TG_OP;
  
  -- Check rate limit
  SELECT public.check_database_rate_limit(
    current_user_id,
    operation_type,
    TG_TABLE_NAME,
    client_ip
  ) INTO rate_limit_passed;
  
  -- If rate limit exceeded, raise exception
  IF NOT rate_limit_passed THEN
    RAISE EXCEPTION 'Rate limit exceeded for % operation on % table. Please wait before making more requests.', 
      operation_type, TG_TABLE_NAME
    USING ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply rate limiting triggers to main user-facing tables
-- Songs table
DROP TRIGGER IF EXISTS rate_limit_songs_trigger ON public.songs;
CREATE TRIGGER rate_limit_songs_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.database_rate_limit_trigger();

-- Song sections table
DROP TRIGGER IF EXISTS rate_limit_song_sections_trigger ON public.song_sections;
CREATE TRIGGER rate_limit_song_sections_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.song_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.database_rate_limit_trigger();

-- User library actions table
DROP TRIGGER IF EXISTS rate_limit_user_library_actions_trigger ON public.user_library_actions;
CREATE TRIGGER rate_limit_user_library_actions_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_library_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.database_rate_limit_trigger();

-- Song likes table
DROP TRIGGER IF EXISTS rate_limit_song_likes_trigger ON public.song_likes;
CREATE TRIGGER rate_limit_song_likes_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.song_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.database_rate_limit_trigger();

-- Profiles table
DROP TRIGGER IF EXISTS rate_limit_profiles_trigger ON public.profiles;
CREATE TRIGGER rate_limit_profiles_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.database_rate_limit_trigger();

-- User follows table
DROP TRIGGER IF EXISTS rate_limit_user_follows_trigger ON public.user_follows;
CREATE TRIGGER rate_limit_user_follows_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.database_rate_limit_trigger();

-- Create function to check RPC rate limits
CREATE OR REPLACE FUNCTION public.check_rpc_rate_limit(
  function_name TEXT,
  user_id_param UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_user_id UUID;
  client_ip INET;
  rate_limit_passed BOOLEAN;
BEGIN
  -- Get current user ID
  current_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Skip rate limiting for system operations
  IF current_user_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Get client IP
  BEGIN
    client_ip := public.get_client_ip();
  EXCEPTION WHEN OTHERS THEN
    client_ip := '127.0.0.1'::inet;
  END;
  
  -- Check rate limit
  SELECT public.check_database_rate_limit(
    current_user_id,
    'RPC',
    function_name,
    client_ip
  ) INTO rate_limit_passed;
  
  RETURN rate_limit_passed;
END;
$$;

-- Create wrapper function for rate-limited RPC calls
CREATE OR REPLACE FUNCTION public.rate_limited_rpc(
  function_name TEXT,
  params JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  rate_limit_passed BOOLEAN;
  result JSONB;
BEGIN
  -- Check rate limit
  SELECT public.check_rpc_rate_limit(function_name) INTO rate_limit_passed;
  
  IF NOT rate_limit_passed THEN
    RAISE EXCEPTION 'Rate limit exceeded for RPC function %. Please wait before making more requests.', 
      function_name
    USING ERRCODE = 'P0001';
  END IF;
  
  -- This is a placeholder - actual RPC execution would need to be handled differently
  -- depending on the specific function being called
  RETURN jsonb_build_object('status', 'rate_limit_passed', 'function', function_name);
END;
$$;

-- Create function to reset rate limits for a user (admin only)
CREATE OR REPLACE FUNCTION public.reset_user_rate_limits(
  target_user_id UUID,
  operation_type TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_user_role public.user_role;
BEGIN
  -- Check if current user is admin
  SELECT public.get_user_role(auth.uid()) INTO current_user_role;
  
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only administrators can reset rate limits'
    USING ERRCODE = 'P0001';
  END IF;
  
  -- Reset rate limits
  IF operation_type IS NOT NULL THEN
    DELETE FROM public.rate_limits 
    WHERE user_id = target_user_id 
    AND endpoint LIKE operation_type || '%';
  ELSE
    DELETE FROM public.rate_limits 
    WHERE user_id = target_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create function to get rate limit status for a user
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(
  target_user_id UUID DEFAULT NULL
) RETURNS TABLE(
  endpoint TEXT,
  current_count INTEGER,
  rate_limit INTEGER,
  window_start TIMESTAMP WITH TIME ZONE,
  time_remaining INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(target_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    rl.endpoint,
    rl.request_count as current_count,
    CASE 
      WHEN rl.endpoint LIKE 'SELECT%' THEN 500
      WHEN rl.endpoint LIKE 'INSERT%' THEN 100
      WHEN rl.endpoint LIKE 'UPDATE%' THEN 200
      WHEN rl.endpoint LIKE 'DELETE%' THEN 50
      WHEN rl.endpoint LIKE 'RPC%' THEN 100
      ELSE 100
    END as rate_limit,
    rl.window_start,
    (rl.window_start + INTERVAL '1 minute' - now()) as time_remaining
  FROM public.rate_limits rl
  WHERE rl.user_id = check_user_id
  AND rl.window_start > now() - INTERVAL '1 minute'
  ORDER BY rl.window_start DESC;
END;
$$;