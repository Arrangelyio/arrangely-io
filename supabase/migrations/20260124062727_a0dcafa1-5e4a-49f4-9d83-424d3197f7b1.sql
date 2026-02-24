-- Add preview_audio_r2_key column to sequencer_files table
ALTER TABLE public.sequencer_files 
ADD COLUMN IF NOT EXISTS preview_audio_r2_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sequencer_files.preview_audio_r2_key IS 'R2 storage key for the preview WAV file used in Sequencer Store sample playback';