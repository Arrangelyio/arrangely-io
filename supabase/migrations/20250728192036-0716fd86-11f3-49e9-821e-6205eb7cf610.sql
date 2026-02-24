-- Add category field to songs table
ALTER TABLE public.songs ADD COLUMN category text;

-- Add index for better filtering performance
CREATE INDEX idx_songs_category ON public.songs(category);

-- Add category to song_sections for more detailed categorization if needed
ALTER TABLE public.song_sections ADD COLUMN section_category text;