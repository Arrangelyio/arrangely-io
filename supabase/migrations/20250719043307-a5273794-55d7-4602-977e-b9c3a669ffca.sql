-- Add is_onboarded field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_onboarded BOOLEAN NOT NULL DEFAULT false;

-- Update existing profiles to be marked as onboarded (since they already have data)
UPDATE public.profiles 
SET is_onboarded = true 
WHERE musical_role IS NOT NULL 
  AND usage_context IS NOT NULL 
  AND experience_level IS NOT NULL;