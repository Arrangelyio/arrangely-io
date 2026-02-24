-- Add is_vip column to event_registrations table
ALTER TABLE public.event_registrations 
ADD COLUMN is_vip boolean NOT NULL DEFAULT false;