-- Create event_ushers table for managing ushers assigned to events
CREATE TABLE IF NOT EXISTS public.event_ushers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_ushers
ALTER TABLE public.event_ushers ENABLE ROW LEVEL SECURITY;

-- Event organizers can manage ushers for their events
CREATE POLICY "Event organizers can manage ushers"
ON public.event_ushers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_ushers.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Admins can manage all ushers
CREATE POLICY "Admins can manage all ushers"
ON public.event_ushers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Ushers can view their assignments
CREATE POLICY "Ushers can view their assignments"
ON public.event_ushers
FOR SELECT
USING (auth.uid() = user_id);

-- Update events table RLS policies to allow users to create events (pending approval)
DROP POLICY IF EXISTS "Users can create events pending approval" ON public.events;
CREATE POLICY "Users can create events pending approval"
ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() = organizer_id
  AND status = 'pending'
);

-- Add pending status support
ALTER TABLE public.events 
ALTER COLUMN status SET DEFAULT 'pending';

-- Update events RLS to allow organizers to view their own events
DROP POLICY IF EXISTS "Organizers can view their events" ON public.events;
CREATE POLICY "Organizers can view their events"
ON public.events
FOR SELECT
USING (
  auth.uid() = organizer_id
  OR status = 'active'
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Update events RLS to allow organizers to update their own events
DROP POLICY IF EXISTS "Organizers can update their events" ON public.events;
CREATE POLICY "Organizers can update their events"
ON public.events
FOR UPDATE
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

-- Event organizers can view registrations for their events
DROP POLICY IF EXISTS "Event organizers can manage registrations" ON public.event_registrations;
CREATE POLICY "Event organizers can manage registrations"
ON public.event_registrations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_registrations.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_event_ushers_event_id ON public.event_ushers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ushers_user_id ON public.event_ushers(user_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);