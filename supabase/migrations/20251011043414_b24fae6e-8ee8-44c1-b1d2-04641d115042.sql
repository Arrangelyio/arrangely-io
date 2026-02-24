-- Add introduction_video_url field to profiles table for creators
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS introduction_video_url text;

-- Add introduction_title and introduction_description for creator intro videos  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS introduction_title text,
ADD COLUMN IF NOT EXISTS introduction_description text;

COMMENT ON COLUMN public.profiles.introduction_video_url IS 'URL to creator introduction video to help users know the creator better';
COMMENT ON COLUMN public.profiles.introduction_title IS 'Title for the creator introduction';
COMMENT ON COLUMN public.profiles.introduction_description IS 'Brief description of what users will learn from this creator';