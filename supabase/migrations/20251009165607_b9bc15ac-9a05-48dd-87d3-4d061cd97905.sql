-- Drop existing tables if they have wrong schema
DROP TABLE IF EXISTS public.content_access_logs CASCADE;
DROP TABLE IF EXISTS public.security_incidents CASCADE;

-- Create content access logs table for monitoring
CREATE TABLE public.content_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES public.lesson_content(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on content access logs
ALTER TABLE public.content_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_access_logs
CREATE POLICY "Admins can view all access logs"
  ON public.content_access_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Creators can view logs for their lessons"
  ON public.content_access_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lessons WHERE lessons.id = content_access_logs.lesson_id AND lessons.creator_id = auth.uid()));

CREATE POLICY "Users can insert their own access logs"
  ON public.content_access_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for content_access_logs
CREATE INDEX idx_content_access_logs_user_lesson ON public.content_access_logs(user_id, lesson_id, created_at DESC);
CREATE INDEX idx_content_access_logs_created_at ON public.content_access_logs(created_at DESC);

-- Create security incidents table
CREATE TABLE public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on security incidents
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_incidents
CREATE POLICY "Only admins can view security incidents"
  ON public.security_incidents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Only admins can update security incidents"
  ON public.security_incidents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Anyone can report security incidents"
  ON public.security_incidents FOR INSERT
  WITH CHECK (true);

-- Indexes for security_incidents
CREATE INDEX idx_security_incidents_severity_created ON public.security_incidents(severity, created_at DESC) WHERE resolved = false;
CREATE INDEX idx_security_incidents_user ON public.security_incidents(user_id, created_at DESC);

-- Auto-update trigger function
CREATE OR REPLACE FUNCTION update_security_incident_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-updating timestamps
CREATE TRIGGER update_security_incidents_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION update_security_incident_updated_at();

-- Add security columns to lessons table
ALTER TABLE public.lessons 
  ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS download_prevention BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 2;

-- Documentation comments
COMMENT ON TABLE public.content_access_logs IS 'Tracks content access for security monitoring and fraud prevention';
COMMENT ON TABLE public.security_incidents IS 'Logs security incidents for creator protection and platform security';
COMMENT ON COLUMN public.lessons.watermark_enabled IS 'Controls video watermarks for piracy prevention';
COMMENT ON COLUMN public.lessons.download_prevention IS 'Implements measures to prevent unauthorized downloads';
COMMENT ON COLUMN public.lessons.max_concurrent_sessions IS 'Maximum simultaneous viewing sessions allowed per user';