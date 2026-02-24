-- Create table for tier assessment threshold configurations
CREATE TABLE IF NOT EXISTS public.tier_assessment_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  instrument TEXT,
  pass_threshold INTEGER NOT NULL DEFAULT 70,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, sub_category, instrument, is_production)
);

-- Enable RLS
ALTER TABLE public.tier_assessment_thresholds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view thresholds"
  ON public.tier_assessment_thresholds
  FOR SELECT
  USING (is_production = true);

CREATE POLICY "Only admins can manage thresholds"
  ON public.tier_assessment_thresholds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default thresholds for common combinations
INSERT INTO public.tier_assessment_thresholds (category, sub_category, instrument, pass_threshold) VALUES
  ('instrument', 'guitar', 'guitar', 70),
  ('instrument', 'bass', 'bass', 70),
  ('instrument', 'piano', 'piano', 70),
  ('instrument', 'drum', 'drum', 70),
  ('instrument', 'vocals', 'vocals', 70),
  ('instrument', 'saxophone', 'saxophone', 70),
  ('theory', 'theory', 'general', 70),
  ('production', 'production', 'general', 70),
  ('songwriting', 'songwriting', 'general', 70),
  ('worship_leader', 'worship_leader', 'general', 70)
ON CONFLICT (category, sub_category, instrument, is_production) DO NOTHING;