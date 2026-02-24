-- Create a function to get user emails for admin users
CREATE OR REPLACE FUNCTION public.get_admin_users_with_emails()
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  email text,
  display_name text,
  role public.user_role,
  creator_type public.creator_type,
  musical_role text,
  created_at timestamp with time zone,
  is_onboarded boolean,
  avatar_url text,
  bio text,
  instruments text[],
  usage_context text,
  experience_level text,
  permissions jsonb,
  is_production boolean,
  phone_number character varying,
  first_name text,
  last_name text,
  city text,
  country text,
  hear_about_us text,
  youtube_channel text,
  updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    p.id as profile_id,
    p.user_id,
    COALESCE(au.email, 'No email') as email,
    p.display_name,
    p.role,
    p.creator_type,
    p.musical_role,
    p.created_at,
    p.is_onboarded,
    p.avatar_url,
    p.bio,
    p.instruments,
    p.usage_context,
    p.experience_level,
    p.permissions,
    p.is_production,
    p.phone_number,
    p.first_name,
    p.last_name,
    p.city,
    p.country,
    p.hear_about_us,
    p.youtube_channel,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.user_id = au.id
  WHERE p.is_production = true
  ORDER BY p.created_at DESC;
$$;