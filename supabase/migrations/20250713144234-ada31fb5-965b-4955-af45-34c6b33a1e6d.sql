-- Create enum for song keys
CREATE TYPE public.song_key AS ENUM (
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
);

-- Create enum for time signatures
CREATE TYPE public.time_signature AS ENUM (
  '4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '5/4', '7/8'
);

-- Create enum for section types
CREATE TYPE public.section_type AS ENUM (
  'verse', 'chorus', 'bridge', 'pre-chorus', 'outro', 'intro', 'instrumental', 'tag', 'coda'
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create songs table for arrangement metadata
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  original_key public.song_key NOT NULL DEFAULT 'C',
  current_key public.song_key NOT NULL DEFAULT 'C',
  tempo INTEGER DEFAULT 120,
  time_signature public.time_signature NOT NULL DEFAULT '4/4',
  capo INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song_sections table for master sections (lyrics and chords templates)
CREATE TABLE public.song_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  section_type public.section_type NOT NULL,
  name TEXT, -- custom name like "Verse 1", "Chorus 2"
  lyrics TEXT,
  chords TEXT,
  bar_count INTEGER DEFAULT 4,
  section_time_signature public.time_signature,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(song_id, section_type, name)
);

-- Create arrangements table for song structure
CREATE TABLE public.arrangements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.song_sections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  repeat_count INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song_collaborators table for team collaboration
CREATE TABLE public.song_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for songs
CREATE POLICY "Users can view their own songs" 
ON public.songs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public songs" 
ON public.songs FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view songs they collaborate on"
ON public.songs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.song_collaborators 
    WHERE song_id = id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own songs" 
ON public.songs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs" 
ON public.songs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Song collaborators with edit permission can update songs"
ON public.songs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.song_collaborators 
    WHERE song_id = id AND user_id = auth.uid() AND permission IN ('edit', 'admin')
  )
);

CREATE POLICY "Users can delete their own songs" 
ON public.songs FOR DELETE USING (auth.uid() = user_id);

-- Create policies for song_sections
CREATE POLICY "Users can view sections of their songs" 
ON public.song_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view sections of public songs" 
ON public.song_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND is_public = true)
);

CREATE POLICY "Users can view sections of collaborative songs"
ON public.song_sections FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.song_collaborators sc
    JOIN public.songs s ON sc.song_id = s.id
    WHERE s.id = song_id AND sc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create sections for their songs" 
ON public.song_sections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update sections of their songs" 
ON public.song_sections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

CREATE POLICY "Song collaborators can update sections"
ON public.song_sections FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.song_collaborators sc
    JOIN public.songs s ON sc.song_id = s.id
    WHERE s.id = song_id AND sc.user_id = auth.uid() AND sc.permission IN ('edit', 'admin')
  )
);

CREATE POLICY "Users can delete sections of their songs" 
ON public.song_sections FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

-- Create policies for arrangements
CREATE POLICY "Users can view arrangements of their songs" 
ON public.arrangements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view arrangements of public songs" 
ON public.arrangements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND is_public = true)
);

CREATE POLICY "Users can view arrangements of collaborative songs"
ON public.arrangements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.song_collaborators sc
    JOIN public.songs s ON sc.song_id = s.id
    WHERE s.id = song_id AND sc.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create arrangements for their songs" 
ON public.arrangements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update arrangements of their songs" 
ON public.arrangements FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

CREATE POLICY "Song collaborators can update arrangements"
ON public.arrangements FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.song_collaborators sc
    JOIN public.songs s ON sc.song_id = s.id
    WHERE s.id = song_id AND sc.user_id = auth.uid() AND sc.permission IN ('edit', 'admin')
  )
);

CREATE POLICY "Users can delete arrangements of their songs" 
ON public.arrangements FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

-- Create policies for song_collaborators
CREATE POLICY "Song owners can manage collaborators" 
ON public.song_collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM public.songs WHERE id = song_id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their collaborations" 
ON public.song_collaborators FOR SELECT USING (user_id = auth.uid());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_song_sections_updated_at
  BEFORE UPDATE ON public.song_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_songs_user_id ON public.songs(user_id);
CREATE INDEX idx_songs_is_public ON public.songs(is_public);
CREATE INDEX idx_song_sections_song_id ON public.song_sections(song_id);
CREATE INDEX idx_song_sections_type ON public.song_sections(section_type);
CREATE INDEX idx_arrangements_song_id ON public.arrangements(song_id);
CREATE INDEX idx_arrangements_position ON public.arrangements(song_id, position);
CREATE INDEX idx_song_collaborators_song_id ON public.song_collaborators(song_id);
CREATE INDEX idx_song_collaborators_user_id ON public.song_collaborators(user_id);