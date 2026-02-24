-- Add original_creator_id column to track the original creator when songs are duplicated
-- This allows us to show attribution like "On behalf of [creator]"
ALTER TABLE public.songs ADD COLUMN original_creator_id UUID;

-- Add comment to explain the column purpose
COMMENT ON COLUMN public.songs.original_creator_id IS 'References the original creator when a song is duplicated from another user';