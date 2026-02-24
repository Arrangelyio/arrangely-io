-- Create sessions table for gesture-controlled performance
CREATE TABLE IF NOT EXISTS public.performance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT,
  key TEXT DEFAULT 'C',
  tempo INTEGER DEFAULT 120,
  active_section TEXT DEFAULT 'intro',
  sections JSONB DEFAULT '["intro", "verse", "chorus", "bridge", "outro"]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.performance_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for performance sessions
CREATE POLICY "Anyone can view active sessions" 
ON public.performance_sessions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can create their own sessions" 
ON public.performance_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own sessions" 
ON public.performance_sessions 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_performance_sessions_updated_at
BEFORE UPDATE ON public.performance_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the table
ALTER TABLE public.performance_sessions REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.performance_sessions;