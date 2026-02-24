
-- Add the missing columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS musical_role musical_role_type,
ADD COLUMN IF NOT EXISTS usage_context usage_context_type,
ADD COLUMN IF NOT EXISTS experience_level experience_level_type,
ADD COLUMN IF NOT EXISTS instruments TEXT[];
