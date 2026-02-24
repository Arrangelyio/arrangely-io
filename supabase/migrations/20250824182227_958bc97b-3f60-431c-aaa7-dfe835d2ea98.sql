-- Fix RLS to allow INSERTs and ensure admin/organizer can create events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
CREATE POLICY "Admins can manage all events" ON public.events
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Organizers can manage their events" ON public.events;
CREATE POLICY "Organizers can manage their events" ON public.events
  FOR ALL
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- Keep public view policy
DROP POLICY IF EXISTS "Events are publicly viewable" ON public.events;
CREATE POLICY "Events are publicly viewable" ON public.events
  FOR SELECT
  USING (status = 'active' AND is_production = true);
