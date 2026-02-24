-- Create event_sessions table for quota management
CREATE TABLE IF NOT EXISTS public.event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  session_start_date TIMESTAMPTZ NOT NULL,
  session_end_date TIMESTAMPTZ NOT NULL,
  quota INTEGER NOT NULL,
  remaining_quota INTEGER NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_production BOOLEAN DEFAULT true
);

-- Create event_tickets table for individual ticket tracking
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.event_sessions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  buyer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participant information
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_phone TEXT NOT NULL,
  participant_ktp TEXT,
  
  -- Ticket details
  ticket_number TEXT UNIQUE NOT NULL,
  qr_code_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'checked_in')),
  
  -- Check-in details
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_production BOOLEAN DEFAULT true
);

-- Create event_payments table for payment tracking with expiration
CREATE TABLE IF NOT EXISTS public.event_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Payment details
  amount INTEGER NOT NULL,
  original_amount INTEGER,
  discount_code_id UUID REFERENCES public.discount_codes(id),
  currency TEXT DEFAULT 'IDR',
  
  -- Midtrans integration
  midtrans_order_id TEXT UNIQUE,
  midtrans_transaction_id TEXT,
  payment_method TEXT,
  snap_token TEXT,
  snap_redirect_url TEXT,
  
  -- Payment status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'failed')),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Ticket count
  ticket_count INTEGER NOT NULL DEFAULT 1,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_production BOOLEAN DEFAULT true
);

-- Create event_ticket_change_requests table for customer service
CREATE TABLE IF NOT EXISTS public.event_ticket_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.event_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Change details
  change_type TEXT NOT NULL CHECK (change_type IN ('name', 'email', 'phone', 'ktp')),
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  reason TEXT,
  
  -- Request status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_production BOOLEAN DEFAULT true
);

-- Add columns to events table for new features
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS use_sessions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_expiry_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS allow_multiple_tickets BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_tickets_per_purchase INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS event_qr_code TEXT,
ADD COLUMN IF NOT EXISTS custom_event_url TEXT UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_sessions_event_id ON public.event_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_sessions_active ON public.event_sessions(is_active, session_start_date);
CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON public.event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_payment_id ON public.event_tickets(payment_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_buyer ON public.event_tickets(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_status ON public.event_tickets(status);
CREATE INDEX IF NOT EXISTS idx_event_tickets_ticket_number ON public.event_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_event_payments_event_id ON public.event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_user_id ON public.event_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_status ON public.event_payments(status);
CREATE INDEX IF NOT EXISTS idx_event_payments_expires_at ON public.event_payments(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_event_change_requests_ticket ON public.event_ticket_change_requests(ticket_id);
CREATE INDEX IF NOT EXISTS idx_event_change_requests_status ON public.event_ticket_change_requests(status);

-- Function to generate unique ticket number
-- Replace old function
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_num TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- ✅ Generate a secure, unguessable ticket number
    -- Format example: TKT-20251102-9F3A7C1B4D2E6A9C1B2C3D4E
    -- Contains date prefix for readability + 12 random bytes (96 bits entropy)
    ticket_num := 'TKT-' ||
                  to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
                  upper(encode(gen_random_bytes(12), 'hex'));

    -- Ensure uniqueness in case of a rare collision
    SELECT EXISTS(
      SELECT 1 FROM public.event_tickets WHERE ticket_number = ticket_num
    )
    INTO exists_check;

    -- If not found, exit the loop
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN ticket_num;
END;
$$;


-- Function to reserve session quota (with row-level locking)
CREATE OR REPLACE FUNCTION public.reserve_session_quota(
  p_session_id UUID,
  p_ticket_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT remaining_quota INTO v_remaining
  FROM public.event_sessions
  WHERE id = p_session_id
  FOR UPDATE;
  
  -- Check if enough quota available
  IF v_remaining >= p_ticket_count THEN
    UPDATE public.event_sessions
    SET remaining_quota = remaining_quota - p_ticket_count,
        updated_at = now()
    WHERE id = p_session_id;
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Function to release expired payment quota
CREATE OR REPLACE FUNCTION public.release_expired_payment_quota(p_payment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_ticket_count INTEGER;
BEGIN
  -- Get session and ticket count from tickets
  SELECT session_id, COUNT(*)
  INTO v_session_id, v_ticket_count
  FROM public.event_tickets
  WHERE payment_id = p_payment_id
  GROUP BY session_id;
  
  -- Release quota back to session if exists
  IF v_session_id IS NOT NULL THEN
    UPDATE public.event_sessions
    SET remaining_quota = remaining_quota + v_ticket_count,
        updated_at = now()
    WHERE id = v_session_id;
  END IF;
  
  -- Update ticket status
  UPDATE public.event_tickets
  SET status = 'expired',
      updated_at = now()
  WHERE payment_id = p_payment_id
  AND status = 'pending';
END;
$$;

-- Function to handle payment expiration
CREATE OR REPLACE FUNCTION public.expire_event_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_payment RECORD;
BEGIN
  -- Find and process expired payments
  FOR v_payment IN
    SELECT id FROM public.event_payments
    WHERE status = 'pending'
    AND expires_at < now()
    AND is_production = true
  LOOP
    -- Release quota
    PERFORM public.release_expired_payment_quota(v_payment.id);
    
    -- Update payment status
    UPDATE public.event_payments
    SET status = 'expired',
        updated_at = now()
    WHERE id = v_payment.id;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$;

-- Function to get next available session
CREATE OR REPLACE FUNCTION public.get_next_available_session(p_event_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  SELECT id INTO v_session_id
  FROM public.event_sessions
  WHERE event_id = p_event_id
  AND is_active = true
  AND remaining_quota > 0
  AND session_start_date <= now()
  AND session_end_date >= now()
  ORDER BY order_index ASC, session_start_date ASC
  LIMIT 1;
  
  RETURN v_session_id;
END;
$$;

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION public.set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
BEFORE INSERT ON public.event_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_number();

-- Enable RLS on all tables
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_sessions
CREATE POLICY "Anyone can view active event sessions"
ON public.event_sessions FOR SELECT
USING (is_active = true AND is_production = true);

CREATE POLICY "Event organizers can manage their event sessions"
ON public.event_sessions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_sessions.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- RLS Policies for event_tickets
CREATE POLICY "Users can view their own tickets"
ON public.event_tickets
FOR SELECT
USING (
  buyer_user_id = auth.uid()
);

CREATE POLICY "Event organizers can view all tickets for their events"
ON public.event_tickets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_tickets.event_id
    AND events.organizer_id = auth.uid()
  )
);

CREATE POLICY "Users can create tickets for themselves"
ON public.event_tickets FOR INSERT
WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "Event organizers can update tickets for their events"
ON public.event_tickets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_tickets.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- RLS Policies for event_payments
CREATE POLICY "Users can view their own event payments"
ON public.event_payments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Event organizers can view payments for their events"
ON public.event_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_payments.event_id
    AND events.organizer_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own event payments"
ON public.event_payments FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update event payments"
ON public.event_payments FOR UPDATE
USING (true);

-- RLS Policies for event_ticket_change_requests
CREATE POLICY "Users can view their own change requests"
ON public.event_ticket_change_requests FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Event organizers can view change requests for their events"
ON public.event_ticket_change_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_tickets
    JOIN public.events ON events.id = event_tickets.event_id
    WHERE event_tickets.id = event_ticket_change_requests.ticket_id
    AND events.organizer_id = auth.uid()
  )
);

CREATE POLICY "Users can create change requests for their tickets"
ON public.event_ticket_change_requests FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.event_tickets
    WHERE event_tickets.id = ticket_id
    AND event_tickets.buyer_user_id = auth.uid()
  )
);

CREATE POLICY "Event organizers can update change requests"
ON public.event_ticket_change_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.event_tickets
    JOIN public.events ON events.id = event_tickets.event_id
    WHERE event_tickets.id = event_ticket_change_requests.ticket_id
    AND events.organizer_id = auth.uid()
  )
);