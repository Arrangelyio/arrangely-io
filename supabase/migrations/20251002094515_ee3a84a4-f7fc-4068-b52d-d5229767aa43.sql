-- Add consent field to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN show_in_attendee_list boolean DEFAULT false,
ADD COLUMN certificate_generated_at timestamp with time zone,
ADD COLUMN certificate_url text,
ADD COLUMN survey_completed_at timestamp with time zone;

-- Event Certificates Table
CREATE TABLE public.event_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  certificate_url text NOT NULL,
  serial_number text UNIQUE NOT NULL,
  generated_at timestamp with time zone DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true,
  UNIQUE(event_id, registration_id)
);

ALTER TABLE public.event_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates"
ON public.event_certificates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    WHERE er.id = event_certificates.registration_id
    AND er.user_id = auth.uid()
  )
);

CREATE POLICY "Organizers can view certificates for their events"
ON public.event_certificates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_certificates.event_id
    AND e.organizer_id = auth.uid()
  )
);

-- Event Media Table (Photos/Videos)
CREATE TABLE public.event_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  media_url text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamp with time zone DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true
);

ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media for active events"
ON public.event_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_media.event_id
    AND e.status = 'active'
  )
);

CREATE POLICY "Organizers can manage media for their events"
ON public.event_media FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_media.event_id
    AND e.organizer_id = auth.uid()
  )
);

-- Event Surveys Table
CREATE TABLE public.event_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Event Feedback',
  questions jsonb NOT NULL DEFAULT '[
    {"type": "rating", "question": "How satisfied were you with the event?", "scale": 5},
    {"type": "rating", "question": "How would you rate the content quality?", "scale": 5},
    {"type": "rating", "question": "How would you rate the speaker(s)?", "scale": 5},
    {"type": "rating", "question": "How would you rate the facilities?", "scale": 5},
    {"type": "nps", "question": "How likely are you to recommend this event to others?"},
    {"type": "text", "question": "What did you like most about the event?"},
    {"type": "text", "question": "What could be improved?"}
  ]'::jsonb,
  send_after_hours integer DEFAULT 2,
  created_at timestamp with time zone DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true,
  UNIQUE(event_id)
);

ALTER TABLE public.event_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage surveys for their events"
ON public.event_surveys FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_surveys.event_id
    AND e.organizer_id = auth.uid()
  )
);

-- Event Survey Responses Table
CREATE TABLE public.event_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.event_surveys(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  responses jsonb NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true,
  UNIQUE(survey_id, registration_id)
);

ALTER TABLE public.event_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit their own survey responses"
ON public.event_survey_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    WHERE er.id = event_survey_responses.registration_id
    AND er.user_id = auth.uid()
  )
);

CREATE POLICY "Organizers can view survey responses for their events"
ON public.event_survey_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_surveys es
    JOIN public.events e ON e.id = es.event_id
    WHERE es.id = event_survey_responses.survey_id
    AND e.organizer_id = auth.uid()
  )
);

-- Event Attendee Profiles (for networking)
CREATE TABLE public.event_attendee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company text,
  job_title text,
  bio text,
  linkedin_url text,
  twitter_url text,
  website_url text,
  interests text[],
  looking_for text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true,
  UNIQUE(registration_id)
);

ALTER TABLE public.event_attendee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own attendee profiles"
ON public.event_attendee_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Visible profiles are publicly viewable"
ON public.event_attendee_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    WHERE er.id = event_attendee_profiles.registration_id
    AND er.show_in_attendee_list = true
  )
);

-- Event Networking Connections Table
CREATE TABLE public.event_networking_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  is_production boolean NOT NULL DEFAULT true,
  UNIQUE(event_id, requester_id, receiver_id)
);

ALTER TABLE public.event_networking_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create connection requests"
ON public.event_networking_connections FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own connections"
ON public.event_networking_connections FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update connections they received"
ON public.event_networking_connections FOR UPDATE
USING (auth.uid() = receiver_id);

-- Event Community Posts Table
CREATE TABLE public.event_community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.event_community_posts(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_announcement boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true
);

ALTER TABLE public.event_community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event attendees can view community posts"
ON public.event_community_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    WHERE er.event_id = event_community_posts.event_id
    AND er.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_community_posts.event_id
    AND e.organizer_id = auth.uid()
  )
);

CREATE POLICY "Event attendees can create posts"
ON public.event_community_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    WHERE er.event_id = event_community_posts.event_id
    AND er.user_id = auth.uid()
  ) AND is_announcement = false
);

CREATE POLICY "Organizers can create announcements"
ON public.event_community_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_community_posts.event_id
    AND e.organizer_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own posts"
ON public.event_community_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.event_community_posts FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_event_certificates_event_id ON public.event_certificates(event_id);
CREATE INDEX idx_event_certificates_registration_id ON public.event_certificates(registration_id);
CREATE INDEX idx_event_media_event_id ON public.event_media(event_id);
CREATE INDEX idx_event_surveys_event_id ON public.event_surveys(event_id);
CREATE INDEX idx_event_survey_responses_survey_id ON public.event_survey_responses(survey_id);
CREATE INDEX idx_event_attendee_profiles_registration_id ON public.event_attendee_profiles(registration_id);
CREATE INDEX idx_event_networking_connections_event_id ON public.event_networking_connections(event_id);
CREATE INDEX idx_event_networking_connections_requester ON public.event_networking_connections(requester_id);
CREATE INDEX idx_event_networking_connections_receiver ON public.event_networking_connections(receiver_id);
CREATE INDEX idx_event_community_posts_event_id ON public.event_community_posts(event_id);
CREATE INDEX idx_event_community_posts_parent_id ON public.event_community_posts(parent_id);

ALTER TABLE event_community_posts
ADD CONSTRAINT fk_event_posts_user
FOREIGN KEY (user_id) REFERENCES profiles(user_id)
ON DELETE CASCADE;


ALTER TABLE event_registrations
ADD CONSTRAINT fk_event_registrations_user
FOREIGN KEY (user_id) REFERENCES profiles(user_id)
ON DELETE CASCADE;
