-- Create admin dashboard RPC functions for efficient filtering

-- Function to get user statistics with date filtering
CREATE OR REPLACE FUNCTION public.get_admin_user_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  total_users bigint,
  monthly_growth bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH filtered_users AS (
    SELECT created_at
    FROM public.profiles
    WHERE is_production = true
    AND (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
  ),
  monthly_users AS (
    SELECT COUNT(*) as current_month_users
    FROM public.profiles
    WHERE is_production = true
    AND created_at >= date_trunc('month', CURRENT_DATE)
  )
  SELECT 
    (SELECT COUNT(*) FROM filtered_users) as total_users,
    (SELECT current_month_users FROM monthly_users) as monthly_growth;
$function$;

-- Function to get song statistics with date filtering
CREATE OR REPLACE FUNCTION public.get_admin_song_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  total_songs bigint,
  monthly_growth bigint,
  total_views bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH filtered_songs AS (
    SELECT created_at, views_count
    FROM public.songs
    WHERE is_production = true
    AND (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
  ),
  monthly_songs AS (
    SELECT COUNT(*) as current_month_songs
    FROM public.songs
    WHERE is_production = true
    AND created_at >= date_trunc('month', CURRENT_DATE)
  ),
  views_data AS (
    SELECT COALESCE(SUM(views_count), 0) as total_views
    FROM public.songs
    WHERE is_production = true
  )
  SELECT 
    (SELECT COUNT(*) FROM filtered_songs) as total_songs,
    (SELECT current_month_songs FROM monthly_songs) as monthly_growth,
    (SELECT total_views FROM views_data) as total_views;
$function$;

-- Function to get revenue statistics with date filtering
CREATE OR REPLACE FUNCTION public.get_admin_revenue_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  total_revenue bigint,
  monthly_revenue bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH filtered_payments AS (
    SELECT amount
    FROM public.payments
    WHERE is_production = true
    AND status = 'paid'
    AND (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
  ),
  monthly_payments AS (
    SELECT COALESCE(SUM(amount), 0) as current_month_revenue
    FROM public.payments
    WHERE is_production = true
    AND status = 'paid'
    AND created_at >= date_trunc('month', CURRENT_DATE)
  )
  SELECT 
    COALESCE(SUM(amount), 0) as total_revenue,
    (SELECT current_month_revenue FROM monthly_payments) as monthly_revenue
  FROM filtered_payments;
$function$;

-- Function to get engagement statistics
CREATE OR REPLACE FUNCTION public.get_admin_engagement_stats()
RETURNS TABLE(
  total_likes bigint,
  total_exports bigint,
  active_subscriptions bigint,
  pending_applications bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    (SELECT COUNT(*) FROM public.song_likes WHERE is_production = true) as total_likes,
    (SELECT COUNT(*) FROM public.pdf_export_usage WHERE is_production = true) as total_exports,
    (SELECT COUNT(*) FROM public.subscriptions WHERE is_production = true AND status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM public.creator_applications WHERE is_production = true AND status = 'pending') as pending_applications;
$function$;

-- Function to get recent activity data
CREATE OR REPLACE FUNCTION public.get_admin_recent_activity()
RETURNS TABLE(
  recent_users jsonb,
  recent_songs jsonb,
  recent_payments jsonb
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH users_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'display_name', display_name,
        'created_at', created_at,
        'role', role
      )
      ORDER BY created_at DESC
    ) as users
    FROM (
      SELECT display_name, created_at, role
      FROM public.profiles
      WHERE is_production = true
      ORDER BY created_at DESC
      LIMIT 5
    ) recent_users_subquery
  ),
  songs_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'title', title,
        'artist', artist,
        'created_at', created_at,
        'is_public', is_public
      )
      ORDER BY created_at DESC
    ) as songs
    FROM (
      SELECT title, artist, created_at, is_public
      FROM public.songs
      WHERE is_production = true
      ORDER BY created_at DESC
      LIMIT 5
    ) recent_songs_subquery
  ),
  payments_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'amount', amount,
        'status', status,
        'created_at', created_at
      )
      ORDER BY created_at DESC
    ) as payments
    FROM (
      SELECT amount, status, created_at
      FROM public.payments
      WHERE is_production = true
      ORDER BY created_at DESC
      LIMIT 5
    ) recent_payments_subquery
  )
  SELECT 
    COALESCE(users_data.users, '[]'::jsonb) as recent_users,
    COALESCE(songs_data.songs, '[]'::jsonb) as recent_songs,
    COALESCE(payments_data.payments, '[]'::jsonb) as recent_payments
  FROM users_data, songs_data, payments_data;
$function$;