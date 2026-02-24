CREATE OR REPLACE FUNCTION public.get_secure_lesson_modules (
  p_lesson_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_enrolled boolean;
  v_result json;
BEGIN
  -- 1. Cek apakah user yang request sudah enroll di lesson
  SELECT EXISTS (
    SELECT 1
    FROM lesson_enrollments
    WHERE user_id = auth.uid()
      AND lesson_id = p_lesson_id
  ) INTO v_is_enrolled;

  -- 2. Ambil modules + content dengan logika keamanan
  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'title', m.title,
      'order_index', m.order_index,
      'lesson_content', (
        SELECT json_agg(
          json_build_object(
            'id', c.id,
            'title', c.title,
            'content_type', c.content_type,
            'duration_minutes', c.duration_minutes,
            'is_preview', c.is_preview,
            'order_index', c.order_index,

            -- Secure video/resource URL:
            'video_url',
              CASE
                WHEN c.is_preview = TRUE OR v_is_enrolled = TRUE
                THEN c.video_url
                ELSE NULL
              END,

            'resource_url',
              CASE
                WHEN c.is_preview = TRUE OR v_is_enrolled = TRUE
                THEN c.resource_url
                ELSE NULL
              END
          )
          ORDER BY c.order_index ASC
        )
        FROM lesson_content c
        WHERE c.module_id = m.id
      )
    )
    ORDER BY m.order_index ASC
  )
  INTO v_result
  FROM lesson_modules m
  WHERE m.lesson_id = p_lesson_id;

  -- Return kosong jika tidak ada modul
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;


CREATE OR REPLACE FUNCTION public.get_lesson_enrollment_count (
  lesson_uuid uuid
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM lesson_enrollments
    WHERE lesson_id = lesson_uuid
  );
END;
$$;
