-- Create event ticket types table (like "PAKET BERDUA BEREMPAT", "NORMAL SALES", etc.)
CREATE TABLE IF NOT EXISTS public.event_ticket_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event ticket categories table (individual ticket categories within each type)
CREATE TABLE IF NOT EXISTS public.event_ticket_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_type_id UUID NOT NULL REFERENCES public.event_ticket_types(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  quota INTEGER,
  remaining_quota INTEGER,
  sale_start_date TIMESTAMP WITH TIME ZONE,
  sale_end_date TIMESTAMP WITH TIME ZONE,
  min_purchase INTEGER DEFAULT 1,
  max_purchase INTEGER DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update event_tickets table to reference ticket categories
ALTER TABLE public.event_tickets 
ADD COLUMN IF NOT EXISTS ticket_category_id UUID REFERENCES public.event_ticket_categories(id) ON DELETE SET NULL;

-- Enable RLS on event_ticket_types
ALTER TABLE public.event_ticket_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view active ticket types for active events
CREATE POLICY "Anyone can view active ticket types for active events"
  ON public.event_ticket_types
  FOR SELECT
  USING (
    is_active = true 
    AND is_production = true
    AND EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_ticket_types.event_id 
      AND e.status = 'active'
    )
  );

-- Event organizers can manage ticket types for their events
CREATE POLICY "Event organizers can manage their ticket types"
  ON public.event_ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_ticket_types.event_id 
      AND e.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_ticket_types.event_id 
      AND e.organizer_id = auth.uid()
    )
  );

-- Admins can manage all ticket types
CREATE POLICY "Admins can manage all ticket types"
  ON public.event_ticket_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'::user_role
    )
  );

-- Enable RLS on event_ticket_categories
ALTER TABLE public.event_ticket_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active ticket categories for active events
CREATE POLICY "Anyone can view active ticket categories"
  ON public.event_ticket_categories
  FOR SELECT
  USING (
    is_active = true 
    AND is_production = true
    AND EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_ticket_categories.event_id 
      AND e.status = 'active'
    )
  );

-- Event organizers can manage ticket categories for their events
CREATE POLICY "Event organizers can manage their ticket categories"
  ON public.event_ticket_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_ticket_categories.event_id 
      AND e.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e 
      WHERE e.id = event_ticket_categories.event_id 
      AND e.organizer_id = auth.uid()
    )
  );

-- Admins can manage all ticket categories
CREATE POLICY "Admins can manage all ticket categories"
  ON public.event_ticket_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'::user_role
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON public.event_ticket_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_types_active ON public.event_ticket_types(is_active, is_production);
CREATE INDEX IF NOT EXISTS idx_event_ticket_categories_ticket_type_id ON public.event_ticket_categories(ticket_type_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_categories_event_id ON public.event_ticket_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_event_ticket_categories_active ON public.event_ticket_categories(is_active, is_production);
CREATE INDEX IF NOT EXISTS idx_event_tickets_category_id ON public.event_tickets(ticket_category_id);