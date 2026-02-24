-- Create function to get customer metrics
CREATE OR REPLACE FUNCTION get_admin_customer_metrics(
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  new_customers BIGINT,
  total_renewals BIGINT,
  once_renewed BIGINT,
  twice_renewed BIGINT,
  three_times_renewed BIGINT,
  four_plus_renewed BIGINT,
  churned_customers BIGINT,
  subscriptions_by_plan JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 0) Semua subscription NON–Free Trial (lifetime, tanpa filter tanggal)
  all_non_trial AS (
    SELECT s.*
    FROM subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE sp.name <> 'Free Trial'
  ),

  -- 1) Baris subscriptions NON–Free Trial yang created_at dalam window
  non_trial_in_window AS (
    SELECT s.*
    FROM subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE sp.name <> 'Free Trial'
      AND (start_date IS NULL OR s.created_at >= start_date)
      AND (end_date   IS NULL OR s.created_at <= end_date)
  ),

  -- 2) New customers: first-ever NON–Free Trial subscription user yang jatuh di dalam window
  new_customer_count AS (
    SELECT COUNT(DISTINCT s.user_id) AS count
    FROM non_trial_in_window s
    WHERE NOT EXISTS (
      SELECT 1
      FROM all_non_trial s2
      WHERE s2.user_id = s.user_id
        AND s2.created_at < s.created_at
    )
  ),

  -- 3) Renewal events NON–Free Trial yang TERJADI dalam window
  renewal_events AS (
    SELECT s.user_id, s.id
    FROM non_trial_in_window s
    WHERE EXISTS (
      SELECT 1
      FROM all_non_trial s2
      WHERE s2.user_id = s.user_id
        AND s2.created_at < s.created_at
    )
  ),
  renewal_counts AS (
    SELECT user_id, COUNT(*) AS renewal_count
    FROM renewal_events
    GROUP BY user_id
  ),
  renewal_breakdown AS (
    SELECT
      COALESCE(COUNT(*), 0)                                   AS total_renewals,
      COALESCE(COUNT(*) FILTER (WHERE renewal_count = 1), 0)  AS once_renewed,
      COALESCE(COUNT(*) FILTER (WHERE renewal_count = 2), 0)  AS twice_renewed,
      COALESCE(COUNT(*) FILTER (WHERE renewal_count = 3), 0)  AS three_times_renewed,
      COALESCE(COUNT(*) FILTER (WHERE renewal_count >= 4), 0) AS four_plus_renewed
    FROM renewal_counts
  ),

  -- 4) Active (NON–Free Trial) di dalam window
  active_in_window AS (
    SELECT COUNT(DISTINCT s.user_id) AS count
    FROM non_trial_in_window s
    WHERE s.status = 'active'
  ),

  -- 5) Churn (NON–Free Trial):
  --    Ambil subscription TERAKHIR per user (lifetime) dari all_non_trial,
  --    lalu hitung yang expired dan current_period_end jatuh dalam window.
  last_non_trial_per_user AS (
    SELECT DISTINCT ON (s.user_id)
           s.user_id, s.status, s.current_period_end, s.created_at
    FROM all_non_trial s
    ORDER BY s.user_id, s.created_at DESC
  ),
  churned_count AS (
    SELECT COUNT(*) AS count
    FROM last_non_trial_per_user l
    WHERE l.status = 'active'
      AND (start_date IS NULL OR l.current_period_end >= start_date)
      AND (end_date   IS NULL OR l.current_period_end <= end_date)
  ),

  -- 6) Stats per plan (NON–Free Trial) dalam window.
  --    Revenue: payments.success dalam window juga.
  plan_stats AS (
    SELECT
      sp.name AS plan_name,
      sp.interval_type,
      COUNT(DISTINCT s.user_id) AS subscriber_count,
      COALESCE(SUM(
        CASE
          WHEN p.status = 'paid'
           AND (start_date IS NULL OR p.created_at >= start_date)
           AND (end_date   IS NULL OR p.created_at <= end_date)
          THEN p.amount ELSE 0 END
      ), 0) AS total_revenue
    FROM non_trial_in_window s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    LEFT JOIN payments p ON p.subscription_id = s.id
    GROUP BY sp.id, sp.name, sp.interval_type
    ORDER BY subscriber_count DESC
  )

  SELECT
    COALESCE((SELECT nc.count               FROM new_customer_count   nc), 0)::BIGINT AS new_customers,
    COALESCE((SELECT rb.total_renewals      FROM renewal_breakdown    rb), 0)::BIGINT AS total_renewals,
    COALESCE((SELECT rb.once_renewed        FROM renewal_breakdown    rb), 0)::BIGINT AS once_renewed,
    COALESCE((SELECT rb.twice_renewed       FROM renewal_breakdown    rb), 0)::BIGINT AS twice_renewed,
    COALESCE((SELECT rb.three_times_renewed FROM renewal_breakdown    rb), 0)::BIGINT AS three_times_renewed,
    COALESCE((SELECT rb.four_plus_renewed   FROM renewal_breakdown    rb), 0)::BIGINT AS four_plus_renewed,
    COALESCE((SELECT cc.count               FROM churned_count        cc), 0)::BIGINT AS churned_customers,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'plan_name', plan_name,
        'interval_type', interval_type,
        'subscriber_count', subscriber_count,
        'total_revenue', total_revenue
      ))
       FROM plan_stats),
      '[]'::jsonb
    ) AS subscriptions_by_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_new_customers_detail(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  display_name TEXT,
  email TEXT,
  plan_name TEXT,
  subscribed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.display_name, p.email, sp.name AS plan_name, s.created_at AS subscribed_at
  FROM subscriptions s
  JOIN profiles p ON p.user_id = s.user_id
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE sp.name <> 'Free Trial'
    AND (start_date IS NULL OR s.created_at >= start_date)
    AND (end_date IS NULL OR s.created_at <= end_date)
    AND NOT EXISTS (
      SELECT 1
      FROM subscriptions s2
      JOIN subscription_plans sp2 ON sp2.id = s2.plan_id AND sp2.name <> 'Free Trial'
      WHERE s2.user_id = s.user_id
        AND s2.created_at < s.created_at
    )
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;


CREATE OR REPLACE FUNCTION public.get_churned_customers_detail(start_date TIMESTAMPTZ DEFAULT NULL, end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
  display_name TEXT,
  email TEXT,
  plan_name TEXT,
  expired_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH last_sub AS (
    SELECT DISTINCT ON (s.user_id)
           s.user_id, s.status, s.current_period_end, s.plan_id
    FROM subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE sp.name <> 'Free Trial'
    ORDER BY s.user_id, s.created_at DESC
  )
  SELECT p.display_name, p.email, sp.name AS plan_name, l.current_period_end AS expired_at
  FROM last_sub l
  JOIN profiles p ON p.user_id = l.user_id
  JOIN subscription_plans sp ON sp.id = l.plan_id
  WHERE l.status IN ('active')
    AND (start_date IS NULL OR l.current_period_end >= start_date)
    AND (end_date   IS NULL OR l.current_period_end <= end_date)
  ORDER BY l.current_period_end DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_renewed_customers_detail(
  renewal_times INT,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  display_name TEXT,
  email        TEXT,
  plan_name    TEXT,
  renewed_at   TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 0) Semua subscription NON–Free Trial & sudah dibayar (lifetime)
  all_non_trial AS (
    SELECT s.*
    FROM subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE sp.name <> 'Free Trial'
  ),

  -- 1) Yang terjadi DI DALAM window (subset dari all_non_trial)
  non_trial_in_window AS (
    SELECT s.*
    FROM all_non_trial s
    WHERE (start_date IS NULL OR s.created_at >= start_date)
      AND (end_date   IS NULL OR s.created_at <= end_date)
  ),

  -- 2) Renewal events yang TERJADI di window:
  --    sebuah baris dianggap renewal jika ada subscription terdahulu (paid & non-trial) pada user tsb.
  renewal_events AS (
    SELECT s.user_id, s.id, s.plan_id, s.created_at
    FROM non_trial_in_window s
    WHERE EXISTS (
      SELECT 1
      FROM all_non_trial s2
      WHERE s2.user_id = s.user_id
        AND s2.created_at < s.created_at
    )
  ),

  -- 3) Hitung JUMLAH renewal event PER USER DI WINDOW (identik dengan metrics)
  renewal_counts AS (
    SELECT user_id, COUNT(*) AS renewal_count
    FROM renewal_events
    GROUP BY user_id
  ),

  -- 4) Ambil user yang renewal_count sesuai parameter
  filtered_users AS (
    SELECT user_id
    FROM renewal_counts
    WHERE CASE
            WHEN renewal_times >= 4 THEN renewal_count >= 4
            ELSE renewal_count = renewal_times
          END
  ),

  -- 5) Ambil 1 baris renewal TERBARU per user (masih di WINDOW)
  latest_renewal AS (
    SELECT DISTINCT ON (r.user_id)
           r.user_id, r.plan_id, r.created_at AS renewed_at
    FROM renewal_events r
    JOIN filtered_users f ON f.user_id = r.user_id
    ORDER BY r.user_id, r.created_at DESC
  )

  -- 6) Join ke profiles dan subscription_plans
  SELECT
    p.display_name,
    p.email,
    sp.name AS plan_name,
    l.renewed_at
  FROM latest_renewal l
  JOIN profiles p ON p.user_id = l.user_id
  JOIN subscription_plans sp ON sp.id = l.plan_id
  ORDER BY l.renewed_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;