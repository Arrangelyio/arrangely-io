-- Add registration_id column to event_tickets table
ALTER TABLE event_tickets 
ADD COLUMN registration_id uuid REFERENCES event_registrations(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_event_tickets_registration_id ON event_tickets(registration_id);