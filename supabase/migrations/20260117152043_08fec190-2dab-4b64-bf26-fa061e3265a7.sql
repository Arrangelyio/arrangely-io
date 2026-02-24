-- Create admin RPC functions for lesson_whitelist management
-- These functions use SECURITY DEFINER to bypass RLS

-- 1. Get all whitelist entries with lesson and user info (for admin)
CREATE OR REPLACE FUNCTION public.admin_get_lesson_whitelist(
  p_search TEXT DEFAULT '',
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  lesson_id UUID,
  lesson_title TEXT,
  user_id UUID,
  user_email TEXT,
  user_display_name TEXT,
  added_by UUID,
  added_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_limit;
  v_total BIGINT;
BEGIN
  -- First get total count
  SELECT COUNT(*) INTO v_total
  FROM public.lesson_whitelist lw
  LEFT JOIN public.lessons l ON lw.lesson_id = l.id
  LEFT JOIN public.profiles p ON lw.user_id = p.user_id
  WHERE lw.is_production = true
    AND (
      p_search = ''
      OR l.title ILIKE '%' || p_search || '%'
      OR p.display_name ILIKE '%' || p_search || '%'
    );

  RETURN QUERY
  SELECT 
    lw.id,
    lw.lesson_id,
    l.title AS lesson_title,
    lw.user_id,
    au.email AS user_email,
    p.display_name AS user_display_name,
    lw.added_by,
    ap.display_name AS added_by_name,
    lw.notes,
    lw.created_at,
    lw.updated_at,
    v_total AS total_count
  FROM public.lesson_whitelist lw
  LEFT JOIN public.lessons l ON lw.lesson_id = l.id
  LEFT JOIN public.profiles p ON lw.user_id = p.user_id
  LEFT JOIN auth.users au ON lw.user_id = au.id
  LEFT JOIN public.profiles ap ON lw.added_by = ap.user_id
  WHERE lw.is_production = true
    AND (
      p_search = ''
      OR l.title ILIKE '%' || p_search || '%'
      OR p.display_name ILIKE '%' || p_search || '%'
    )
  ORDER BY lw.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- 2. Add user to whitelist (admin only)
CREATE OR REPLACE FUNCTION public.admin_add_to_lesson_whitelist(
  p_lesson_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get current user id (the admin)
  v_admin_id := auth.uid();
  
  INSERT INTO public.lesson_whitelist (lesson_id, user_id, added_by, notes, is_production)
  VALUES (p_lesson_id, p_user_id, v_admin_id, p_notes, true)
  ON CONFLICT (lesson_id, user_id) DO UPDATE SET
    notes = COALESCE(p_notes, lesson_whitelist.notes),
    updated_at = now()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 3. Update whitelist entry notes (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_lesson_whitelist(
  p_id UUID,
  p_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lesson_whitelist
  SET notes = p_notes, updated_at = now()
  WHERE id = p_id AND is_production = true;
  
  RETURN FOUND;
END;
$$;

-- 4. Remove from whitelist (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_from_lesson_whitelist(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.lesson_whitelist
  WHERE id = p_id AND is_production = true;
  
  RETURN FOUND;
END;
$$;

-- 5. Get lessons for dropdown (simplified)
CREATE OR REPLACE FUNCTION public.admin_get_lessons_for_whitelist()
RETURNS TABLE (
  id UUID,
  title TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title
  FROM public.lessons
  WHERE is_production = true
  ORDER BY title;
$$;

-- 6. Search users for dropdown
CREATE OR REPLACE FUNCTION public.admin_search_users_for_whitelist(p_search TEXT DEFAULT '')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    au.email,
    p.display_name
  FROM public.profiles p
  JOIN auth.users au ON p.user_id = au.id
  WHERE p.is_production = true
    AND (
      p_search = ''
      OR au.email ILIKE '%' || p_search || '%'
      OR p.display_name ILIKE '%' || p_search || '%'
    )
  ORDER BY p.display_name
  LIMIT 50;
$$;