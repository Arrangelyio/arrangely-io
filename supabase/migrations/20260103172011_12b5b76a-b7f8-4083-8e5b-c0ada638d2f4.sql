-- Add foreign key relationship between user_admin_roles and profiles
ALTER TABLE public.user_admin_roles
ADD CONSTRAINT user_admin_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;



CREATE OR REPLACE FUNCTION get_admin_creator_dashboard(
    date_from timestamp DEFAULT NULL,
    date_to   timestamp DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    display_name text,
    avatar_url text,
    bio text,
    musical_role text,
    experience_level text,
    instruments text[],
    creator_type text,
    created_at timestamptz,
    email text,

    total_song_count bigint,
    original_count bigint,
    arrangement_count bigint,
    transcribe_count bigint,
    library_adds bigint,
    lesson_enrolled bigint,
    amount_lesson numeric,

    discount_amount numeric,
    discount_code_breakdown jsonb,
    total_earnings numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH 
        songs_agg AS (
            SELECT
                s.user_id AS u_id, 
                COUNT(s.id)::BIGINT AS s_count,
                COUNT(s.id) FILTER (WHERE TRIM(LOWER(s.contribution_type)) = 'original')::BIGINT AS original_cnt,
                COUNT(s.id) FILTER (WHERE TRIM(LOWER(s.contribution_type)) = 'arrangement')::BIGINT AS arrangement_cnt,
                COUNT(s.id) FILTER (WHERE TRIM(LOWER(s.contribution_type)) = 'transcription')::BIGINT AS transcribe_cnt
            FROM public.songs s
            WHERE s.is_public = true
              AND (date_from IS NULL OR s.created_at >= date_from)
              AND (date_to   IS NULL OR s.created_at <= date_to)
            GROUP BY s.user_id
        ),

        lessons_agg AS (
            SELECT
                l.creator_id AS c_id,
                COUNT(le.id)::BIGINT AS l_enrolled,
                (
                    SUM(COALESCE(l.price, 0))
                        FILTER (WHERE le.enrolled_at IS NOT NULL)
                    * 0.7
                )::NUMERIC AS l_amount
            FROM public.lesson_enrollments le
            JOIN public.lessons l ON le.lesson_id = l.id
            WHERE (date_from IS NULL OR le.enrolled_at >= date_from)
              AND (date_to   IS NULL OR le.enrolled_at <= date_to)
            GROUP BY l.creator_id
        ),

        -- STEP 1: discount per code
        discounts_per_code AS (
            SELECT
                dca.creator_id,
                dc.code,
                SUM(
                    p.amount * (cbc.benefit_discount_code / 100.0)
                )::NUMERIC AS earnings,
                COUNT(DISTINCT p.id)::BIGINT AS uses
            FROM public.discount_code_assignments dca
            JOIN public.discount_codes dc
                 ON dca.discount_code_id = dc.id
            JOIN public.payments p
                 ON p.discount_code_id = dc.id
            LEFT JOIN public.creator_benefit_configs cbc
                   ON cbc.creator_id = dca.creator_id
            WHERE p.is_production = true
              AND p.status = 'paid'
              AND p.lesson_id IS NULL
              AND (date_from IS NULL OR p.paid_at >= date_from)
              AND (date_to   IS NULL OR p.paid_at <= date_to)
            GROUP BY dca.creator_id, dc.code
        ),

        -- STEP 2: discount aggregate per creator
        discounts_agg AS (
            SELECT
                creator_id AS d_c_id,
                SUM(earnings)::NUMERIC AS d_benefit,
                jsonb_agg(
                    jsonb_build_object(
                        'code', code,
                        'earnings', earnings,
                        'uses', uses
                    )
                    ORDER BY earnings DESC
                ) AS discount_code_breakdown
            FROM discounts_per_code
            GROUP BY creator_id
        ),

        benefits_agg AS (
            SELECT
                cb.creator_id AS b_c_id,
                SUM(cb.amount)::NUMERIC AS b_earnings
            FROM public.creator_benefits cb
            WHERE cb.benefit_type IN ('library_add', 'song_publish')
              AND (date_from IS NULL OR cb.created_at >= date_from)
              AND (date_to   IS NULL OR cb.created_at <= date_to)
            GROUP BY cb.creator_id
        ),

        lib_actions_agg AS (
            SELECT
                la.user_original_id AS l_a_id,
                COUNT(*)::BIGINT AS l_adds
            FROM public.user_library_actions la
            WHERE (date_from IS NULL OR la.created_at >= date_from)
              AND (date_to   IS NULL OR la.created_at <= date_to)
            GROUP BY la.user_original_id
        )

    SELECT
        p.id,
        p.user_id,
        p.display_name,
        p.avatar_url,
        p.bio,
        p.musical_role::text,
        p.experience_level::text,
        p.instruments,
        p.creator_type::text,
        p.created_at,
        u.email::text,

        COALESCE(sa.s_count, 0)::BIGINT AS total_song_count,
        COALESCE(sa.original_cnt, 0)::BIGINT AS original_count,
        COALESCE(sa.arrangement_cnt, 0)::BIGINT AS arrangement_count,
        COALESCE(sa.transcribe_cnt, 0)::BIGINT AS transcribe_count,
        COALESCE(la.l_adds, 0)::BIGINT AS library_adds,
        COALESCE(le.l_enrolled, 0)::BIGINT AS lesson_enrolled,
        COALESCE(le.l_amount, 0)::NUMERIC AS amount_lesson,

        COALESCE(da.d_benefit, 0)::NUMERIC AS discount_amount,
        da.discount_code_breakdown,

        (
            COALESCE(ba.b_earnings, 0)
          + COALESCE(da.d_benefit, 0)
          + COALESCE(le.l_amount, 0)
        )::NUMERIC AS total_earnings

    FROM public.profiles p
    JOIN auth.users u ON p.user_id = u.id
    LEFT JOIN songs_agg sa ON p.user_id = sa.u_id
    LEFT JOIN lessons_agg le ON p.user_id = le.c_id
    LEFT JOIN discounts_agg da ON p.user_id = da.d_c_id
    LEFT JOIN benefits_agg ba ON p.user_id = ba.b_c_id
    LEFT JOIN lib_actions_agg la ON p.user_id = la.l_a_id
    WHERE p.role = 'creator'
      AND p.creator_type::text IN ('creator_arrangely', 'creator_professional');
END;
$$;
