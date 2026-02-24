DROP FUNCTION IF EXISTS public.get_admin_revenue_stats(timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_admin_revenue_stats(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  gross_revenue bigint,
  net_revenue bigint,
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
      dc.discount_type,
      dc.discount_value,

      -- HITUNG ORIGINAL AMOUNT
      CASE
        WHEN dc.discount_type = 'percentage' THEN 
          ROUND(p.amount / (1 - (dc.discount_value / 100.0)))

        WHEN dc.discount_type = 'fixed' THEN 
          p.amount + dc.discount_value

        ELSE 
          p.amount
      END AS original_amount

    FROM public.payments p
    LEFT JOIN public.discount_codes dc 
      ON p.discount_code_id = dc.id

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
    COALESCE(SUM(original_amount), 0) as gross_revenue,
    COALESCE(SUM(net_amount), 0) as net_revenue,
    COALESCE(SUM(original_amount - net_amount), 0) as total_discount,
    (SELECT current_month_revenue FROM monthly_payments) as monthly_revenue
  FROM filtered_payments;
$function$;
