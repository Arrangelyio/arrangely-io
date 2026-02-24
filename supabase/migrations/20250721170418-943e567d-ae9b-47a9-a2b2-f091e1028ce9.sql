-- Create creator applications table
CREATE TABLE public.creator_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  musical_background TEXT NOT NULL,
  experience_years INTEGER,
  instruments TEXT[],
  specialties TEXT[],
  sample_work_url TEXT,
  motivation TEXT NOT NULL,
  social_links JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own applications"
ON public.creator_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications"
ON public.creator_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
ON public.creator_applications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_creator_applications_updated_at
BEFORE UPDATE ON public.creator_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_creator_applications_user_id ON public.creator_applications(user_id);
CREATE INDEX idx_creator_applications_status ON public.creator_applications(status);
CREATE INDEX idx_creator_applications_created_at ON public.creator_applications(created_at DESC);