-- Add creator_type enum and column to profiles table
CREATE TYPE public.creator_type AS ENUM ('creator_arrangely', 'creator_professional');

ALTER TABLE public.profiles 
ADD COLUMN creator_type public.creator_type DEFAULT 'creator_arrangely';

-- Add created_sign column to songs table (immutable after creation)
ALTER TABLE public.songs 
ADD COLUMN created_sign TEXT;