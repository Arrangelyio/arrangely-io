create or replace function validate_library_limit(
  user_id_param uuid
) 
returns integer
language plpgsql
as $$
DECLARE
  current_count INTEGER;
  user_limit INTEGER := 10; -- default limit
  library_limit_json TEXT;
  period_start DATE;
BEGIN
  -- Ambil current_period_start dan limit 'library' dari subscription aktif
  SELECT 
    s.current_period_start::date,
    sp.features::jsonb ->> 'library'
  INTO period_start, library_limit_json
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_id_param
    AND (s.status = 'active' OR s.status = 'trialing')
    AND CURRENT_DATE >= s.current_period_start::date
    AND CURRENT_DATE <= (s.current_period_end + INTERVAL '1 day')::date
  LIMIT 1;

  -- Hitung jumlah 'add_to_library' setelah current_period_start
  SELECT COUNT(*)
  INTO current_count
  FROM public.user_library_actions
  WHERE user_id = user_id_param
    AND action_type = 'add_to_library'
    AND created_at >= period_start;  -- hanya yang di periode aktif

  -- Tetapkan limit dari subscription jika ada
  IF library_limit_json IS NOT NULL THEN
    IF library_limit_json = 'unlimited' THEN
      RETURN TRUE; -- tidak dibatasi
    ELSE
      user_limit := library_limit_json::int;
    END IF;
  END IF;

  -- Return apakah masih boleh tambah ke library
  RETURN current_count < user_limit;
END;

CREATE OR REPLACE FUNCTION public.get_user_pdf_export_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  export_limit text;
BEGIN
  -- Ambil limit dari subscription
  SELECT sp.features::jsonb ->> 'pdf_exports'
  INTO export_limit
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_id_param
    AND (s.status = 'active' OR s.status = 'trialing')
    AND CURRENT_DATE >= s.current_period_start::date
    AND CURRENT_DATE <= (s.current_period_end + interval '1 day')::date
  LIMIT 1;

  -- Handle limit
  IF export_limit IS NULL THEN
    RETURN NULL; -- fallback ke FREE_TIER di frontend
  ELSIF export_limit = 'unlimited' THEN
    RETURN -1; -- convention: -1 = unlimited
  ELSE
    RETURN (export_limit)::int;
  END IF;
END;
$$;

-- =====================================================
-- Validate PDF Export Limit
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_pdf_export_limit(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
  user_limit integer := 5; -- default limit untuk PDF export
  pdf_limit_json integer;
BEGIN
  -- Hitung jumlah export PDF user
  SELECT COUNT(*)
  INTO current_count
  FROM public.pdf_export_usage
  WHERE user_id = user_id_param;

  -- Ambil limit dari subscription (kalau ada)
  SELECT (sp.features::jsonb ->> 'pdf_export')::int
  INTO pdf_limit_json
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_id_param
    AND (s.status = 'active' OR s.status = 'trialing')
    AND CURRENT_DATE >= s.current_period_start::date
    AND CURRENT_DATE <= (s.current_period_end + interval '1 day')::date
  LIMIT 1;

  IF pdf_limit_json IS NOT NULL THEN
    user_limit := pdf_limit_json;
  END IF;

  RETURN current_count < user_limit;
END;
$$;


-- =====================================================
-- Validate Arrangement Limit
-- =====================================================
DECLARE
  current_count INTEGER;
  user_limit INTEGER := 20; -- default limit arrangements
  arrangement_limit_json TEXT;
  period_start DATE;
BEGIN
  -- Ambil current_period_start dan arrangement_limit dalam satu query
  SELECT 
    s.current_period_start::date,
    sp.features::jsonb ->> 'arrangements'
  INTO period_start, arrangement_limit_json
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_id_param
    AND (s.status = 'active' OR s.status = 'trialing')
    AND CURRENT_DATE >= s.current_period_start::date
    AND CURRENT_DATE <= (s.current_period_end + INTERVAL '1 day')::date
  LIMIT 1;

  -- Hitung jumlah arrangement user setelah current_period_start
  SELECT COUNT(*)
  INTO current_count
  FROM public.songs
  WHERE user_id = user_id_param
    AND original_creator_id IS NULL
    AND (created_at >= period_start);  -- filter hanya lagu setelah periode aktif dimulai

  -- Handle unlimited atau nilai limit lainnya
  IF arrangement_limit_json IS NOT NULL THEN
    IF arrangement_limit_json = 'unlimited' THEN
      RETURN TRUE;
    ELSE
      user_limit := arrangement_limit_json::int;
    END IF;
  END IF;

  RETURN current_count < user_limit;
END;

CREATE OR REPLACE FUNCTION public.get_user_feature(user_id_param uuid, feature_key text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  feature_value text;
BEGIN
  -- Ambil value dari JSON features
  SELECT sp.features::jsonb ->> feature_key
  INTO feature_value
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_id_param
    AND (s.status = 'active' OR s.status = 'trialing')
    AND CURRENT_DATE >= s.current_period_start::date
    AND CURRENT_DATE <= (s.current_period_end + interval '1 day')::date
  LIMIT 1;

  -- Kalau NULL, berarti default = false
  IF feature_value IS NULL THEN
    RETURN false;
  END IF;

  -- Cast text ke boolean (true/false)
  RETURN (feature_value)::boolean;
END;
$$;

create policy "Admins can manage all subscription plans"
on "public"."subscription_plans"
as permissive
for all
to public
using (
  exists (
    select 1
    from profiles
    where profiles.user_id = auth.uid()
      and profiles.role = 'admin'::user_role
  )
);
