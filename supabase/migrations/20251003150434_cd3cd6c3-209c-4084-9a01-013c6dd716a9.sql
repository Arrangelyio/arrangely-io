-- Create event promotional news table for banner carousel
CREATE TABLE IF NOT EXISTS public.event_promotional_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_event_order UNIQUE (event_id, order_index),
  CONSTRAINT max_5_news_per_event CHECK (
    order_index >= 0 AND order_index < 5
  )
);

-- Add index for faster queries
CREATE INDEX idx_event_promotional_news_event_id ON public.event_promotional_news(event_id);
CREATE INDEX idx_event_promotional_news_active ON public.event_promotional_news(event_id, is_active, order_index);

-- Enable RLS
ALTER TABLE public.event_promotional_news ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active promotional news"
  ON public.event_promotional_news
  FOR SELECT
  USING (is_active = true AND is_production = true);

CREATE POLICY "Event organizers can manage their promotional news"
  ON public.event_promotional_news
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_promotional_news.event_id
      AND events.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_promotional_news.event_id
      AND events.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all promotional news"
  ON public.event_promotional_news
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_event_promotional_news_updated_at
  BEFORE UPDATE ON public.event_promotional_news
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.event_promotional_news IS 'Promotional banner carousel items for events (max 5 per event)';
COMMENT ON COLUMN public.event_promotional_news.order_index IS 'Display order in carousel (0-4, enforced by constraint)';
COMMENT ON COLUMN public.event_promotional_news.is_active IS 'Whether this news item is currently displayed';