-- Add song_section_id column to sequencer_user_sections
ALTER TABLE public.sequencer_user_sections
ADD COLUMN song_section_id UUID REFERENCES public.song_sections(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_sequencer_user_sections_song_section_id 
ON public.sequencer_user_sections(song_section_id);

-- Add comment for documentation
COMMENT ON COLUMN public.sequencer_user_sections.song_section_id IS 'Reference to the song section that this sequencer section is based on';