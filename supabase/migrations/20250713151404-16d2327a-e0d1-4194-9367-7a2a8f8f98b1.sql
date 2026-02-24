-- Add additional fields for enhanced library features
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS folder_id UUID,
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Create folders table for organization
CREATE TABLE IF NOT EXISTS public.song_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on song_folders
ALTER TABLE public.song_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for song_folders
CREATE POLICY "Users can create their own folders" 
ON public.song_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own folders" 
ON public.song_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.song_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.song_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create song_activity table for tracking user interactions
CREATE TABLE IF NOT EXISTS public.song_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('view', 'edit', 'play', 'favorite', 'unfavorite')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on song_activity
ALTER TABLE public.song_activity ENABLE ROW LEVEL SECURITY;

-- Create policies for song_activity
CREATE POLICY "Users can create their own activity" 
ON public.song_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity" 
ON public.song_activity 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.songs 
ADD CONSTRAINT songs_folder_id_fkey 
FOREIGN KEY (folder_id) REFERENCES public.song_folders(id) ON DELETE SET NULL;

ALTER TABLE public.song_activity 
ADD CONSTRAINT song_activity_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
ADD CONSTRAINT song_activity_song_id_fkey 
FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

-- Create updated_at trigger for song_folders
CREATE TRIGGER update_song_folders_updated_at
BEFORE UPDATE ON public.song_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_user_id_created_at ON public.songs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_is_favorite ON public.songs(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_songs_folder_id ON public.songs(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_song_activity_user_song ON public.song_activity(user_id, song_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_folders_user_id ON public.song_folders(user_id);