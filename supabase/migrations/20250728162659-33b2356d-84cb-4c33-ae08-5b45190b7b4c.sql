-- Create table to track creator benefits earned
CREATE TABLE IF NOT EXISTS public.creator_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('song_publish', 'library_add')),
  amount INTEGER NOT NULL DEFAULT 0,
  song_id UUID NULL,
  added_by_user_id UUID NULL,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_benefits ENABLE ROW LEVEL SECURITY;

-- Create policies for creator_benefits
CREATE POLICY "Admins can manage all creator benefits" 
ON public.creator_benefits 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::public.user_role
));

CREATE POLICY "Creators can view their own benefits" 
ON public.creator_benefits 
FOR SELECT 
USING (creator_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_creator_benefits_updated_at
BEFORE UPDATE ON public.creator_benefits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate creator earnings
CREATE OR REPLACE FUNCTION public.get_creator_earnings(creator_id UUID)
RETURNS TABLE(
  total_earnings INTEGER,
  monthly_earnings INTEGER,
  song_publish_earnings INTEGER,
  library_add_earnings INTEGER,
  total_library_adds INTEGER
)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    COALESCE(SUM(amount), 0)::INTEGER as total_earnings,
    COALESCE(SUM(CASE 
      WHEN created_at >= date_trunc('month', CURRENT_DATE) 
      AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      THEN amount 
      ELSE 0 
    END), 0)::INTEGER as monthly_earnings,
    COALESCE(SUM(CASE WHEN benefit_type = 'song_publish' THEN amount ELSE 0 END), 0)::INTEGER as song_publish_earnings,
    COALESCE(SUM(CASE WHEN benefit_type = 'library_add' THEN amount ELSE 0 END), 0)::INTEGER as library_add_earnings,
    COALESCE(COUNT(CASE WHEN benefit_type = 'library_add' THEN 1 END), 0)::INTEGER as total_library_adds
  FROM public.creator_benefits 
  WHERE creator_benefits.creator_id = $1 
  AND is_production = true;
$$;

-- Create function to add song publish benefit
CREATE OR REPLACE FUNCTION public.add_song_publish_benefit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  benefit_config RECORD;
BEGIN
  -- Only process if song is being published (is_public = true)
  IF NEW.is_public = true AND (OLD.is_public IS NULL OR OLD.is_public = false) THEN
    -- Get benefit configuration for this creator
    SELECT * INTO benefit_config
    FROM public.creator_benefit_configs
    WHERE creator_id = NEW.user_id 
    AND is_active = true 
    AND is_production = true
    LIMIT 1;
    
    -- If configuration exists and benefit > 0, add benefit
    IF benefit_config.id IS NOT NULL AND benefit_config.benefit_per_song_publish > 0 THEN
      INSERT INTO public.creator_benefits (
        creator_id,
        benefit_type,
        amount,
        song_id,
        is_production
      ) VALUES (
        NEW.user_id,
        'song_publish',
        benefit_config.benefit_per_song_publish,
        NEW.id,
        NEW.is_production
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for song publish benefits
CREATE TRIGGER song_publish_benefit_trigger
AFTER UPDATE ON public.songs
FOR EACH ROW
EXECUTE FUNCTION public.add_song_publish_benefit();

-- Create function to add library add benefit
CREATE OR REPLACE FUNCTION public.add_library_add_benefit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  benefit_config RECORD;
  song_creator_id UUID;
BEGIN
  -- Get the song creator ID
  SELECT user_id INTO song_creator_id
  FROM public.songs
  WHERE id = NEW.song_id
  LIMIT 1;
  
  -- Get benefit configuration for the song creator
  SELECT * INTO benefit_config
  FROM public.creator_benefit_configs
  WHERE creator_id = song_creator_id 
  AND is_active = true 
  AND is_production = true
  LIMIT 1;
  
  -- If configuration exists and benefit > 0, add benefit
  IF benefit_config.id IS NOT NULL AND benefit_config.benefit_per_library_add > 0 THEN
    INSERT INTO public.creator_benefits (
      creator_id,
      benefit_type,
      amount,
      song_id,
      added_by_user_id,
      is_production
    ) VALUES (
      song_creator_id,
      'library_add',
      benefit_config.benefit_per_library_add,
      NEW.song_id,
      NEW.user_id,
      NEW.is_production
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for library add benefits
CREATE TRIGGER library_add_benefit_trigger
AFTER INSERT ON public.user_library_actions
FOR EACH ROW
EXECUTE FUNCTION public.add_library_add_benefit();