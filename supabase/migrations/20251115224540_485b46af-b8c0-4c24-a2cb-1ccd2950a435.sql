-- Add start_time and end_time columns to sequencer_user_sections
ALTER TABLE public.sequencer_user_sections
ADD COLUMN start_time numeric,
ADD COLUMN end_time numeric;

-- Add index for better query performance
CREATE INDEX idx_sequencer_user_sections_times ON public.sequencer_user_sections(start_time, end_time);