-- Create table for sequencer file pricing
CREATE TABLE IF NOT EXISTS public.sequencer_file_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequencer_file_id UUID NOT NULL REFERENCES public.sequencer_files(id) ON DELETE CASCADE,
  price INTEGER NOT NULL DEFAULT 0, -- Price in smallest currency unit (e.g., cents/IDR)
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequencer_file_id, is_production)
);

-- Create table for user sequencer enrollments (purchases)
CREATE TABLE IF NOT EXISTS public.sequencer_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sequencer_file_id UUID NOT NULL REFERENCES public.sequencer_files(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, sequencer_file_id, is_production)
);

-- Enable RLS on new tables
ALTER TABLE public.sequencer_file_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequencer_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sequencer_file_pricing
CREATE POLICY "Anyone can view active pricing"
  ON public.sequencer_file_pricing
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins and creators can manage pricing"
  ON public.sequencer_file_pricing
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
    )
  );

-- RLS Policies for sequencer_enrollments
CREATE POLICY "Users can view their own enrollments"
  ON public.sequencer_enrollments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert enrollments"
  ON public.sequencer_enrollments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
  ON public.sequencer_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sequencer_file_pricing_file_id 
  ON public.sequencer_file_pricing(sequencer_file_id);

CREATE INDEX IF NOT EXISTS idx_sequencer_enrollments_user_id 
  ON public.sequencer_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_sequencer_enrollments_file_id 
  ON public.sequencer_enrollments(sequencer_file_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_sequencer_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_sequencer_pricing_updated_at
  BEFORE UPDATE ON public.sequencer_file_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sequencer_pricing_updated_at();