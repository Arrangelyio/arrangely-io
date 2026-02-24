-- Create creator_tiers table for managing tier levels
CREATE TABLE public.creator_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL,
  tier_icon TEXT, -- Emoji or icon identifier
  min_library_adds INTEGER NOT NULL DEFAULT 0,
  max_library_adds INTEGER, -- NULL means unlimited (for top tier)
  benefit_per_add NUMERIC(10,2) NOT NULL DEFAULT 250,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator_tier_config table for global settings
CREATE TABLE public.creator_tier_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  description TEXT,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.creator_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_tier_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_tiers
CREATE POLICY "Anyone can view active creator tiers"
  ON public.creator_tiers
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage creator tiers"
  ON public.creator_tiers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'support_admin')
    )
  );

-- RLS Policies for creator_tier_config
CREATE POLICY "Anyone can view creator tier config"
  ON public.creator_tier_config
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage creator tier config"
  ON public.creator_tier_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'support_admin')
    )
  );

-- Create trigger for updated_at on creator_tiers
CREATE TRIGGER update_creator_tiers_updated_at
  BEFORE UPDATE ON public.creator_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on creator_tier_config
CREATE TRIGGER update_creator_tier_config_updated_at
  BEFORE UPDATE ON public.creator_tier_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tiers based on the image
INSERT INTO public.creator_tiers (tier_name, tier_icon, min_library_adds, max_library_adds, benefit_per_add, display_order, description)
VALUES
  ('Session Tier', '🎧', 0, 1000, 250, 1, 'Entry level tier for new creators'),
  ('Groove Tier', '🎸', 1001, 5000, 300, 2, 'Growing creators with consistent engagement'),
  ('Harmony Tier', '🎹', 5001, 10000, 400, 3, 'Established creators with strong community'),
  ('Maestro Tier', '🎼', 10001, NULL, 500, 4, 'Top tier creators with exceptional reach');

-- Insert default config for counting start date
INSERT INTO public.creator_tier_config (config_key, config_value, description)
VALUES
  ('counting_start_date', now()::text, 'Start date for counting library adds towards tier progression. Only actions after this date will be counted.');

-- Create index for better query performance
CREATE INDEX idx_creator_tiers_display_order ON public.creator_tiers(display_order);
CREATE INDEX idx_creator_tiers_active ON public.creator_tiers(is_active, is_production);