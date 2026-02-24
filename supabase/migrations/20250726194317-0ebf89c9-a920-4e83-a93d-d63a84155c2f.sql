-- Create performance_sessions table for gesture-controlled performances
CREATE TABLE IF NOT EXISTS public.performance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT,
  key TEXT NOT NULL,
  tempo INTEGER NOT NULL DEFAULT 120,
  active_section TEXT NOT NULL DEFAULT 'intro',
  sections JSONB NOT NULL DEFAULT '["intro", "verse", "chorus", "bridge", "outro"]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.performance_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for performance sessions
CREATE POLICY "Performance sessions are viewable by everyone" 
ON public.performance_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create performance sessions" 
ON public.performance_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update performance sessions" 
ON public.performance_sessions 
FOR UPDATE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_performance_sessions_updated_at
BEFORE UPDATE ON public.performance_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for performance_sessions
ALTER TABLE public.performance_sessions REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.performance_sessions;