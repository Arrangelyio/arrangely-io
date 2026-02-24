-- Create table for creator benefit configurations
CREATE TABLE public.creator_benefit_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  benefit_per_song_publish integer NOT NULL DEFAULT 0,
  benefit_per_library_add integer NOT NULL DEFAULT 250,
  is_active boolean NOT NULL DEFAULT true,
  is_production boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(creator_id)
);

-- Enable Row Level Security
ALTER TABLE public.creator_benefit_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage all creator benefit configs" 
ON public.creator_benefit_configs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Creators can view their own benefit config" 
ON public.creator_benefit_configs 
FOR SELECT 
USING (creator_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_creator_benefit_configs_updated_at
  BEFORE UPDATE ON public.creator_benefit_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();