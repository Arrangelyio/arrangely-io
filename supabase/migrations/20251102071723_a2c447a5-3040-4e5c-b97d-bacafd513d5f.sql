-- Add max_purchase configuration to events table
ALTER TABLE public.events 
ADD COLUMN enable_max_purchase BOOLEAN DEFAULT false,
ADD COLUMN max_purchase INTEGER DEFAULT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN public.events.enable_max_purchase IS 'If true, enforces max_purchase limit per user. If false, no purchase limit is applied.';
COMMENT ON COLUMN public.events.max_purchase IS 'Maximum number of tickets a user can purchase across all categories in this event. Only enforced if enable_max_purchase is true.';