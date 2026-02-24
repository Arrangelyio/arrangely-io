-- Create table to track YouTube import usage
CREATE TABLE public.youtube_import_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  import_type TEXT NOT NULL DEFAULT 'enhanced_analysis', -- 'enhanced_analysis', 'community_search'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youtube_import_usage ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own imports
CREATE POLICY "Users can track their own YouTube imports" 
ON public.youtube_import_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own import history
CREATE POLICY "Users can view their own YouTube import history" 
ON public.youtube_import_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_youtube_import_usage_user_id ON public.youtube_import_usage(user_id);
CREATE INDEX idx_youtube_import_usage_imported_at ON public.youtube_import_usage(imported_at DESC);

-- Create function to get user's YouTube import count for current month
CREATE OR REPLACE FUNCTION public.get_user_monthly_youtube_import_count(user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.youtube_import_usage
  WHERE user_id = $1
    AND imported_at >= date_trunc('month', CURRENT_DATE)
    AND imported_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
$$;