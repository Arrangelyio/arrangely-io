-- Fix security warnings by adding SET search_path to functions that are missing it

-- Fix get_client_ip function
CREATE OR REPLACE FUNCTION public.get_client_ip()
RETURNS INET
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Fix database_rate_limit_trigger function
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

-- Fix check_rpc_rate_limit function
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

-- Fix rate_limited_rpc function
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