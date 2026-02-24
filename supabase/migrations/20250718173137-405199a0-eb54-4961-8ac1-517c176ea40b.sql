-- Create setlists table
CREATE TABLE public.setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  theme TEXT,
  song_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;

-- Create policies for setlists
CREATE POLICY "Users can view their own setlists" 
ON public.setlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own setlists" 
ON public.setlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own setlists" 
ON public.setlists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own setlists" 
ON public.setlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_setlists_updated_at
BEFORE UPDATE ON public.setlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();