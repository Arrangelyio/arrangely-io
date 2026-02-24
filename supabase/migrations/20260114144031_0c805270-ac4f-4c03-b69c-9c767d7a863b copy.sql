DROP FUNCTION IF EXISTS public.get_admin_revenue_stats(timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_admin_revenue_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  gross_revenue_sub bigint,
  net_revenue_sub bigint,
  revenue_lesson bigint,
  gross_revenue_total bigint, -- Kolom baru untuk total gabungan
  net_revenue_total bigint,   -- Kolom baru untuk total gabungan
  total_discount bigint,
  monthly_revenue bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH filtered_payments AS (
    SELECT 
      p.amount AS net_amount,
      p.payment_type,
      dc.discount_type,
      dc.discount_value,
      CASE
        WHEN dc.discount_type = 'percentage' THEN 
          ROUND(p.amount / (1 - (dc.discount_value / 100.0)))
        WHEN dc.discount_type = 'fixed' THEN 
          p.amount + dc.discount_value
        ELSE p.amount
      END AS original_amount
    FROM public.payments p
    LEFT JOIN public.discount_codes dc ON p.discount_code_id = dc.id
    WHERE p.is_production = true
      AND p.status = 'paid'
      AND (start_date IS NULL OR p.created_at >= start_date)
      AND (end_date IS NULL OR p.created_at <= end_date)
      AND p.midtrans_order_id NOT LIKE 'EVT-%'
  ),
  monthly_payments AS (
    SELECT COALESCE(SUM(amount), 0) as current_month_revenue
    FROM public.payments
    WHERE is_production = true
      AND status = 'paid'
      AND created_at >= date_trunc('month', CURRENT_DATE)
      AND midtrans_order_id NOT LIKE 'EVT-%'
  )
  SELECT 
    COALESCE(SUM(original_amount) FILTER (WHERE LOWER(payment_type) LIKE 'sub%'), 0)::bigint as gross_revenue_sub,
    COALESCE(SUM(net_amount) FILTER (WHERE LOWER(payment_type) LIKE 'sub%'), 0)::bigint as net_revenue_sub,
    COALESCE(SUM(net_amount) FILTER (WHERE LOWER(payment_type) LIKE 'lesson%'), 0)::bigint as revenue_lesson,
    -- Hitung Total Keseluruhan
    COALESCE(SUM(original_amount), 0)::bigint as gross_revenue_total,
    COALESCE(SUM(net_amount), 0)::bigint as net_revenue_total,
    COALESCE(SUM(original_amount - net_amount), 0)::bigint as total_discount,
    (SELECT current_month_revenue FROM monthly_payments)::bigint as monthly_revenue
  FROM filtered_payments;
$function$;


CREATE OR REPLACE FUNCTION public.get_admin_tunning_engagement_stats(
  start_date TIMESTAMP DEFAULT NULL,
  end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  total_likes BIGINT,
  total_exports BIGINT,
  active_subscriptions BIGINT,
  pending_applications BIGINT
)
LANGUAGE sql
AS $$
SELECT
  -- Total song likes
  (
    SELECT COUNT(*)
    FROM public.song_likes sl
    WHERE sl.is_production = true
      AND (start_date IS NULL OR sl.created_at >= start_date)
      AND (end_date IS NULL OR sl.created_at <= end_date)
  ) AS total_likes,

  -- Total PDF exports
  (
    SELECT COUNT(*)
    FROM public.pdf_export_usage pe
    WHERE pe.is_production = true
      AND (start_date IS NULL OR pe.created_at >= start_date)
      AND (end_date IS NULL OR pe.created_at <= end_date)
  ) AS total_exports,

  -- Active subscriptions (based on period, NOT status)
  (
    SELECT COUNT(*)
    FROM public.subscriptions s
    WHERE s.is_production = true
      AND s.current_period_start <= NOW()
      AND s.current_period_end >= NOW()
      AND (start_date IS NULL OR s.created_at >= start_date)
      AND (end_date IS NULL OR s.created_at <= end_date)
  ) AS active_subscriptions,

  -- Pending creator applications
  (
    SELECT COUNT(*)
    FROM public.creator_applications ca
    WHERE ca.is_production = true
      AND ca.status = 'pending'
      AND (start_date IS NULL OR ca.created_at >= start_date)
      AND (end_date IS NULL OR ca.created_at <= end_date)
  ) AS pending_applications;
$$;
