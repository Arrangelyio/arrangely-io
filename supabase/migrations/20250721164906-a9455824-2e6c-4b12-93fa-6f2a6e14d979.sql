-- Create song_likes table for tracking user likes
CREATE TABLE public.song_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Enable RLS
ALTER TABLE public.song_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for song_likes
CREATE POLICY "Users can view their own likes"
ON public.song_likes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own likes"
ON public.song_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON public.song_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create user_follows table for following creators
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Create policies for user_follows
CREATE POLICY "Users can view their own follows"
ON public.user_follows
FOR SELECT
USING (auth.uid() = follower_id);

CREATE POLICY "Users can create their own follows"
ON public.user_follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows"
ON public.user_follows
FOR DELETE
USING (auth.uid() = follower_id);

-- Add youtube_link and youtube_thumbnail to songs table
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS youtube_link TEXT,
ADD COLUMN IF NOT EXISTS youtube_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Beginner',
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'worship';

-- Create function to increment view count
CREATE OR REPLACE FUNCTION public.increment_song_views(song_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.songs 
  SET views_count = COALESCE(views_count, 0) + 1,
      last_viewed_at = now()
  WHERE id = song_id;
END;
$$;

-- Create function to get song like count
CREATE OR REPLACE FUNCTION public.get_song_like_count(song_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.song_likes
  WHERE song_likes.song_id = $1;
$$;

-- Create function to check if user likes song
CREATE OR REPLACE FUNCTION public.user_likes_song(song_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.song_likes
    WHERE song_likes.song_id = $1 AND song_likes.user_id = $2
  );
$$;

-- Create function to check if user follows creator
CREATE OR REPLACE FUNCTION public.user_follows_creator(creator_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.user_follows
    WHERE following_id = $1 AND follower_id = $2
  );
$$;