-- Add setlist_id column to events table
ALTER TABLE public.events 
ADD COLUMN setlist_id uuid REFERENCES public.setlists(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_events_setlist_id ON public.events(setlist_id);

-- Add RLS policy for setlists to be viewable if linked to an event
CREATE POLICY "Setlists linked to events are viewable by event viewers"
ON public.setlists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.setlist_id = setlists.id
    AND (events.status = 'active' OR events.organizer_id = auth.uid())
  )
);