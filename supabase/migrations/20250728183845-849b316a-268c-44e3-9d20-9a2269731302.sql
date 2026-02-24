-- Add missing fields to profiles table for complete registration data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS hear_about_us TEXT,
ADD COLUMN IF NOT EXISTS youtube_channel TEXT;