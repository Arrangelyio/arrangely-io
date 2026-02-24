-- Add song_original_id column to user_library_actions table
ALTER TABLE public.user_library_actions 
ADD COLUMN song_original_id uuid;

-- Create a unique constraint to prevent duplicates based on user_id and song_original_id
ALTER TABLE public.user_library_actions 
ADD CONSTRAINT unique_user_song_original UNIQUE (user_id, song_original_id);