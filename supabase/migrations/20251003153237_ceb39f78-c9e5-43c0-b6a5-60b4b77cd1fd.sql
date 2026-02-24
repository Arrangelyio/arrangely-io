-- Add feature tour completion tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_feature_tour_completed boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.is_feature_tour_completed IS 'Tracks whether user has completed the initial feature tour';