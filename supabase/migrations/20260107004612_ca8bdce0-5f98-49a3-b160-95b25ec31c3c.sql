
-- Create a table to map detail/sub-paths to their parent menu_id
CREATE TABLE IF NOT EXISTS public.admin_menu_detail_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id TEXT NOT NULL,
  path_pattern TEXT NOT NULL,
  description TEXT,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_id, path_pattern)
);

-- Enable RLS
ALTER TABLE public.admin_menu_detail_paths ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read detail paths"
ON public.admin_menu_detail_paths
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage
CREATE POLICY "Allow admins to manage detail paths"
ON public.admin_menu_detail_paths
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert common detail path mappings
INSERT INTO public.admin_menu_detail_paths (menu_id, path_pattern, description) VALUES
('creators', '/creator-details/', 'Creator detail pages'),
('users', '/user-details/', 'User detail pages'),
('events', '/event-details/', 'Event detail pages'),
('lessons', '/lesson-details/', 'Lesson detail pages'),
('content', '/content-details/', 'Content detail pages')
ON CONFLICT (menu_id, path_pattern) DO NOTHING;

-- Create function to get menu_id from path (for detail pages)
CREATE OR REPLACE FUNCTION public.get_menu_id_from_path(check_path TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT menu_id
  FROM public.admin_menu_detail_paths
  WHERE check_path LIKE path_pattern || '%'
  AND is_production = true
  LIMIT 1
$$;

-- Update get_user_menu_permissions to also return detail path mappings
CREATE OR REPLACE FUNCTION public.get_user_menu_permissions_with_details(check_user_id uuid)
RETURNS TABLE(menu_id text, can_access boolean, detail_paths text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    amp.menu_id, 
    amp.can_access,
    ARRAY(
      SELECT path_pattern 
      FROM public.admin_menu_detail_paths adp 
      WHERE adp.menu_id = amp.menu_id 
      AND adp.is_production = true
    ) as detail_paths
  FROM public.user_admin_roles uar
  JOIN public.admin_roles ar ON uar.role_id = ar.id
  JOIN public.admin_menu_permissions amp ON ar.id = amp.role_id
  WHERE uar.user_id = check_user_id
    AND ar.is_active = true
    AND amp.can_access = true
    AND uar.is_production = true
    AND ar.is_production = true
    AND amp.is_production = true
$$;
