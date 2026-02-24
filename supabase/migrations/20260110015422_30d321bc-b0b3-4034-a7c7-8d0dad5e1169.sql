-- Create lesson whitelist table for restricted access
CREATE TABLE public.lesson_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  notes TEXT,
  is_production BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, user_id)
);

-- Enable RLS
ALTER TABLE public.lesson_whitelist ENABLE ROW LEVEL SECURITY;

-- CRITICAL: No policies for SELECT, INSERT, UPDATE, DELETE for regular users
-- This means NO user can directly access this table via API
-- The table is completely hidden from the client

-- Create a security definer function to check whitelist status
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_whitelisted_for_lesson(_user_id UUID, _lesson_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lesson_whitelist
    WHERE user_id = _user_id
      AND lesson_id = _lesson_id
  )
$$;

-- Create a function to check if user has lesson access (enrolled OR whitelisted)
CREATE OR REPLACE FUNCTION public.has_lesson_access(_user_id UUID, _lesson_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check regular enrollment
    SELECT 1 FROM public.lesson_enrollments
    WHERE user_id = _user_id AND lesson_id = _lesson_id
  ) OR EXISTS (
    -- Check whitelist
    SELECT 1 FROM public.lesson_whitelist
    WHERE user_id = _user_id AND lesson_id = _lesson_id
  )
$$;

-- Create index for performance
CREATE INDEX idx_lesson_whitelist_user_lesson ON public.lesson_whitelist(user_id, lesson_id);
CREATE INDEX idx_lesson_whitelist_lesson ON public.lesson_whitelist(lesson_id);

-- Create trigger for updated_at
CREATE TRIGGER update_lesson_whitelist_updated_at
  BEFORE UPDATE ON public.lesson_whitelist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();