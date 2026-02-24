-- Fix infinite recursion in songs table RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Song collaborators with edit permission can update songs" ON public.songs;
DROP POLICY IF EXISTS "Users can view songs they collaborate on" ON public.songs;

-- Create a security definer function to check collaboration permissions
CREATE OR REPLACE FUNCTION public.user_can_access_song(_song_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.song_collaborators 
    WHERE song_id = _song_id AND user_id = _user_id
  );
$$;

-- Create a security definer function to check edit permissions
CREATE OR REPLACE FUNCTION public.user_can_edit_song(_song_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.song_collaborators 
    WHERE song_id = _song_id 
    AND user_id = _user_id 
    AND permission IN ('edit', 'admin')
  );
$$;

-- Recreate the fixed policies
CREATE POLICY "Song collaborators with edit permission can update songs" 
ON public.songs 
FOR UPDATE 
USING (public.user_can_edit_song(id, auth.uid()));

CREATE POLICY "Users can view songs they collaborate on" 
ON public.songs 
FOR SELECT 
USING (public.user_can_access_song(id, auth.uid()));