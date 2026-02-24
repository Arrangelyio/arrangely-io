-- Create a function to allow live preview access for songs
-- This allows anyone to view song data when accessing via live preview
CREATE OR REPLACE FUNCTION public.is_live_preview_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- This function will return true when we're in a live preview context
  -- For now, we'll make it always return true for live preview access
  -- In a more sophisticated setup, you could check for specific conditions
  SELECT true;
$$;

-- Add a new RLS policy for live preview access
CREATE POLICY "Allow live preview access for all users" 
ON public.songs 
FOR SELECT 
TO authenticated
USING (
  -- Allow access if it's a live preview context
  -- This essentially allows any authenticated user to view songs for live preview
  public.is_live_preview_context() = true
);

-- Also add policies for song sections and arrangements to support live preview
CREATE POLICY "Allow live preview access to sections" 
ON public.song_sections 
FOR SELECT 
TO authenticated
USING (
  -- Allow access to sections if the song allows live preview access
  EXISTS (
    SELECT 1 FROM public.songs 
    WHERE songs.id = song_sections.song_id 
    AND public.is_live_preview_context() = true
  )
);

CREATE POLICY "Allow live preview access to arrangements" 
ON public.arrangements 
FOR SELECT 
TO authenticated
USING (
  -- Allow access to arrangements if the song allows live preview access
  EXISTS (
    SELECT 1 FROM public.songs 
    WHERE songs.id = arrangements.song_id 
    AND public.is_live_preview_context() = true
  )
);