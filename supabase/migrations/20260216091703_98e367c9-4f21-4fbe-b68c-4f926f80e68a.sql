
-- Table to cache AI-generated chord analysis results
CREATE TABLE public.ai_generated_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  youtube_video_id TEXT,
  youtube_url TEXT,
  title TEXT,
  artist TEXT,
  duration NUMERIC,
  bpm NUMERIC,
  time_signature TEXT DEFAULT '4/4',
  song_key TEXT,
  chords JSONB,
  beats_data JSONB,
  lyrics JSONB,
  analysis_raw JSONB,
  is_production BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_generated_songs ENABLE ROW LEVEL SECURITY;

-- Users can view their own generated songs
CREATE POLICY "Users can view own ai_generated_songs"
  ON public.ai_generated_songs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own generated songs
CREATE POLICY "Users can insert own ai_generated_songs"
  ON public.ai_generated_songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own generated songs
CREATE POLICY "Users can update own ai_generated_songs"
  ON public.ai_generated_songs FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own generated songs
CREATE POLICY "Users can delete own ai_generated_songs"
  ON public.ai_generated_songs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups by youtube_video_id per user
CREATE INDEX idx_ai_generated_songs_youtube ON public.ai_generated_songs (user_id, youtube_video_id);

-- Trigger for updated_at
CREATE TRIGGER update_ai_generated_songs_updated_at
  BEFORE UPDATE ON public.ai_generated_songs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
