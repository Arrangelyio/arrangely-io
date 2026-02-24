-- Create table to track PDF export usage
CREATE TABLE public.pdf_export_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  export_type TEXT NOT NULL DEFAULT 'song', -- 'song', 'setlist', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_export_usage ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own exports
CREATE POLICY "Users can track their own exports" 
ON public.pdf_export_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own export history
CREATE POLICY "Users can view their own export history" 
ON public.pdf_export_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_pdf_export_usage_user_id ON public.pdf_export_usage(user_id);
CREATE INDEX idx_pdf_export_usage_exported_at ON public.pdf_export_usage(exported_at DESC);

-- Create function to get user's export count for current month
CREATE OR REPLACE FUNCTION public.get_user_monthly_export_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.pdf_export_usage
  WHERE user_id = $1
    AND exported_at >= date_trunc('month', CURRENT_DATE)
    AND exported_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
$$;