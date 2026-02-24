-- Create table for user-specific sequencer section modifications
CREATE TABLE IF NOT EXISTS public.sequencer_user_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sequencer_file_id UUID NOT NULL REFERENCES public.sequencer_files(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, sequencer_file_id, is_production)
);

-- Enable RLS
ALTER TABLE public.sequencer_user_sections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own section modifications
CREATE POLICY "Users can view their own sequencer sections"
ON public.sequencer_user_sections
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own section modifications if enrolled
CREATE POLICY "Users can create their own sequencer sections if enrolled"
ON public.sequencer_user_sections
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM sequencer_enrollments
    WHERE sequencer_enrollments.user_id = auth.uid()
    AND sequencer_enrollments.sequencer_file_id = sequencer_user_sections.sequencer_file_id
    AND sequencer_enrollments.is_production = sequencer_user_sections.is_production
  )
);

-- Users can update their own section modifications if enrolled
CREATE POLICY "Users can update their own sequencer sections if enrolled"
ON public.sequencer_user_sections
FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM sequencer_enrollments
    WHERE sequencer_enrollments.user_id = auth.uid()
    AND sequencer_enrollments.sequencer_file_id = sequencer_user_sections.sequencer_file_id
    AND sequencer_enrollments.is_production = sequencer_user_sections.is_production
  )
);

-- Users can delete their own section modifications
CREATE POLICY "Users can delete their own sequencer sections"
ON public.sequencer_user_sections
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_sequencer_user_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sequencer_user_sections_updated_at
BEFORE UPDATE ON public.sequencer_user_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_sequencer_user_sections_updated_at();

-- Add index for faster lookups
CREATE INDEX idx_sequencer_user_sections_user_sequencer 
ON public.sequencer_user_sections(user_id, sequencer_file_id, is_production);