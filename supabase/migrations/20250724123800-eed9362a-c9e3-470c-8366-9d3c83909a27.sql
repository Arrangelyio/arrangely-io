-- Create table to track when users add songs to their library
CREATE TABLE public.user_library_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'add_to_library',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, song_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_library_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can add songs to their library" 
ON public.user_library_actions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own library actions" 
ON public.user_library_actions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove songs from their library" 
ON public.user_library_actions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to get library count for a song
CREATE OR REPLACE FUNCTION public.get_song_library_count(song_id uuid)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_library_actions
  WHERE user_library_actions.song_id = $1;
$$;