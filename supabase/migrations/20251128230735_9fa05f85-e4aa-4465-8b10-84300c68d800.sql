-- Create email_jobs table for queued bulk email processing
CREATE TABLE IF NOT EXISTS public.email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attached_image_url TEXT,
  link_url TEXT,
  link_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  is_production BOOLEAN DEFAULT true
);

-- Create index for efficient querying of pending jobs
CREATE INDEX IF NOT EXISTS idx_email_jobs_status_created ON public.email_jobs(status, created_at);

-- Enable RLS
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage email jobs"
ON public.email_jobs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Service role can do everything (for cron job)
CREATE POLICY "Service role can manage email jobs"
ON public.email_jobs
FOR ALL
USING (auth.role() = 'service_role');