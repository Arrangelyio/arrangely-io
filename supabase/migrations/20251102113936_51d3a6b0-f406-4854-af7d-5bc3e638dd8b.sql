-- Add organizer fields to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS organizer_name TEXT,
ADD COLUMN IF NOT EXISTS organizer_icon TEXT;

-- Set organizer_name as required for new events (existing events can have NULL temporarily)
-- We don't set NOT NULL immediately to avoid breaking existing data
UPDATE public.events 
SET organizer_name = 'Event Organizer' 
WHERE organizer_name IS NULL;

-- Now we can safely add the NOT NULL constraint
ALTER TABLE public.events 
ALTER COLUMN organizer_name SET NOT NULL;