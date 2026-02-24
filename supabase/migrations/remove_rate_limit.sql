
DECLARE
  rate_limit_key TEXT;
  current_count INTEGER;
  rate_limit INTEGER;
  window_start_time TIMESTAMP WITH TIME ZONE;
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
  window_start_time := date_trunc('minute', now());
  
  -- Check current rate limit
  SELECT request_count INTO current_count
  FROM public.rate_limits
  WHERE user_id = user_id_param
  AND endpoint = rate_limit_key
  AND window_start = window_start_time;
  
  current_count := COALESCE(current_count, 0);
  
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
  
  -- Update or insert rate limit record using the new unique constraint
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
    window_start_time,
    public.get_current_environment()
  )
  ON CONFLICT (user_id, endpoint, window_start) 
  DO UPDATE SET 
    request_count = rate_limits.request_count + 1,
    ip_address = COALESCE(EXCLUDED.ip_address, rate_limits.ip_address);
  
  RETURN TRUE;
END;


check_database_rate_limit