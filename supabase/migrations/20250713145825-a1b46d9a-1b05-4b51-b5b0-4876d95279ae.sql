-- Add musical role and usage context fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN musical_role TEXT,
ADD COLUMN usage_context TEXT,
ADD COLUMN instruments TEXT[],
ADD COLUMN experience_level TEXT;

-- Create enum for musical roles
CREATE TYPE public.musical_role_type AS ENUM (
  'keyboardist',
  'guitarist', 
  'bassist',
  'drummer',
  'vocalist',
  'worship_leader',
  'music_director',
  'sound_engineer',
  'other'
);

-- Create enum for usage contexts
CREATE TYPE public.usage_context_type AS ENUM (
  'church',
  'event',
  'cafe',
  'concert',
  'studio',
  'personal',
  'education',
  'other'
);

-- Create enum for experience levels
CREATE TYPE public.experience_level_type AS ENUM (
  'beginner',
  'intermediate', 
  'advanced',
  'professional'
);

-- Update the columns to use the enums
ALTER TABLE public.profiles 
ALTER COLUMN musical_role TYPE musical_role_type USING musical_role::musical_role_type,
ALTER COLUMN usage_context TYPE usage_context_type USING usage_context::usage_context_type,
ALTER COLUMN experience_level TYPE experience_level_type USING experience_level::experience_level_type;