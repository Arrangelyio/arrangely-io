-- Add sequencer fields to songs table
ALTER TABLE public.songs 
ADD COLUMN sequencer_drive_link TEXT,
ADD COLUMN sequencer_price INTEGER DEFAULT 0; -- Price in cents, 0 = free

-- Add comment to explain the columns
COMMENT ON COLUMN public.songs.sequencer_drive_link IS 'Google Drive link to the sequencer file';
COMMENT ON COLUMN public.songs.sequencer_price IS 'Price for the sequencer in cents (0 = free)';