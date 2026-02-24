-- Add visibility field to setlists table
ALTER TABLE public.setlists 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.setlists.is_public IS 'Controls whether the setlist is visible on creator public profiles. Only shows if all songs in the setlist are public.';