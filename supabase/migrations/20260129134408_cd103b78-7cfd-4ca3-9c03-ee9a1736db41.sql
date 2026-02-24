-- Drop existing function and recreate with correct return type
DROP FUNCTION IF EXISTS public.get_lesson_enrollment_count(uuid);

CREATE OR REPLACE FUNCTION public.get_lesson_enrollment_count(lesson_uuid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::bigint
  FROM lesson_enrollments
  WHERE lesson_id = lesson_uuid;
$$;