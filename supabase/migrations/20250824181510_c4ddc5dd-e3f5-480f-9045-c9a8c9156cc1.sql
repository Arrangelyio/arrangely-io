-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  banner_image_url TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT NOT NULL,
  address TEXT,
  price INTEGER DEFAULT 0,
  max_capacity INTEGER,
  current_registrations INTEGER DEFAULT 0,
  registration_deadline TIMESTAMPTZ,
  allow_cancellation BOOLEAN DEFAULT true,
  cancellation_deadline TIMESTAMPTZ,
  speaker_name TEXT,
  speaker_bio TEXT,
  speaker_image_url TEXT,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event registrations table  
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id TEXT UNIQUE NOT NULL DEFAULT ('EVT-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  qr_code TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_paid INTEGER DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlisted')),
  check_in_time TIMESTAMPTZ,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
DROP POLICY IF EXISTS "Events are publicly viewable" ON public.events;
CREATE POLICY "Events are publicly viewable" ON public.events
  FOR SELECT USING (status = 'active' AND is_production = true);

DROP POLICY IF EXISTS "Organizers can manage their events" ON public.events;
CREATE POLICY "Organizers can manage their events" ON public.events
  FOR ALL USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
CREATE POLICY "Admins can manage all events" ON public.events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for event registrations  
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
CREATE POLICY "Users can view their own registrations" ON public.event_registrations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events" ON public.event_registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own registrations" ON public.event_registrations;
CREATE POLICY "Users can update their own registrations" ON public.event_registrations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organizers can view registrations for their events" ON public.event_registrations;
CREATE POLICY "Organizers can view registrations for their events" ON public.event_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE id = event_registrations.event_id AND organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all registrations" ON public.event_registrations;
CREATE POLICY "Admins can manage all registrations" ON public.event_registrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update event registration count
CREATE OR REPLACE FUNCTION update_event_registration_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE public.events 
    SET current_registrations = current_registrations + 1
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      UPDATE public.events 
      SET current_registrations = current_registrations - 1
      WHERE id = NEW.event_id;
    ELSIF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE public.events 
      SET current_registrations = current_registrations + 1
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE public.events 
    SET current_registrations = current_registrations - 1
    WHERE id = OLD.event_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_event_count_trigger ON public.event_registrations;
CREATE TRIGGER update_event_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_event_registration_count();

-- Add updated_at triggers
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_registrations_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the Grand Launching Event
INSERT INTO public.events (
  title,
  description,
  date,
  start_time,
  end_time,
  location,
  address,
  price,
  max_capacity,
  current_registrations,
  speaker_name,
  speaker_bio,
  status,
  is_production
) VALUES (
  'Grand Launching Event Arrangely',
  'Join us for the grand launching of Arrangely! Experience the future of worship music arrangement with live demonstrations, workshops, and performances by renowned artists. Discover how Arrangely is revolutionizing the way musicians create, share, and collaborate on worship music.',
  '2025-09-17',
  '16:00',
  '18:00',
  'Jakarta Convention Center',
  'Jl. Gatot Subroto, Jakarta Pusat, DKI Jakarta',
  0,
  200,
  0,
  'Echa Soemantri & Friends, Barry Likumahuwa',
  'Echa Soemantri is a renowned Indonesian worship leader and musician, known for his contributions to contemporary Christian music. Barry Likumahuwa is a celebrated bassist and music producer who has worked with many top Indonesian artists. Together with their musical friends, they will showcase the power of Arrangely in live worship arrangements.',
  'active',
  true
)
ON CONFLICT DO NOTHING;