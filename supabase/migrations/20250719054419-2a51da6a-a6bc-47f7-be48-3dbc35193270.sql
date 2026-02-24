-- Create standardized user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'creator', 'user');

-- Update profiles table to use the new role enum
ALTER TABLE public.profiles 
ADD COLUMN role public.user_role DEFAULT 'user',
ADD COLUMN permissions JSONB DEFAULT '{}';

-- Migrate existing musical_role data to the new role system
UPDATE public.profiles 
SET role = CASE 
  WHEN musical_role IN ('worship_leader', 'musician', 'songwriter') THEN 'creator'::user_role
  ELSE 'user'::user_role
END
WHERE musical_role IS NOT NULL;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'user'::user_role)
  FROM public.profiles 
  WHERE user_id = $1
  LIMIT 1;
$$;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id UUID, permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN get_user_role(user_id) = 'admin' THEN true
      ELSE (
        SELECT COALESCE((permissions ->> permission)::boolean, false)
        FROM public.profiles 
        WHERE user_id = $1
      )
    END;
$$;