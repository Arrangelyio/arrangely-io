-- Add original_creator_id column to songs table to track original creator when songs are duplicated
ALTER TABLE public.songs 
ADD COLUMN original_creator_id UUID;