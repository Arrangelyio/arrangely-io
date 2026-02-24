-- Add storage_type column to sequencer_files for R2 support
ALTER TABLE public.sequencer_files 
ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'supabase';

-- Add comment for clarity
COMMENT ON COLUMN public.sequencer_files.storage_type IS 'Storage backend: supabase (legacy) or r2 (Cloudflare R2 CDN)';