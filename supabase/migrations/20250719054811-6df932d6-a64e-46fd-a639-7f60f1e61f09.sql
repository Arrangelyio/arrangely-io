-- Set one user as admin for testing (update with an actual user ID from your profiles table)
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE user_id = '5e4e63f4-0a14-4f0e-aea7-ecb2f3d383a2'; -- Update this with an actual user ID

-- Set permissions for creators
UPDATE public.profiles 
SET permissions = '{"publish_public": true, "marketplace_access": true, "advanced_features": true}'::jsonb
WHERE role = 'creator';

-- Set default permissions for users  
UPDATE public.profiles 
SET permissions = '{"basic_features": true}'::jsonb
WHERE role = 'user' AND permissions = '{}'::jsonb;