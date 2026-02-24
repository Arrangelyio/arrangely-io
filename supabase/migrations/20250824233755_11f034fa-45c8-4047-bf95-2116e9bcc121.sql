-- Add google_maps_link field to events table
ALTER TABLE public.events 
ADD COLUMN google_maps_link text;