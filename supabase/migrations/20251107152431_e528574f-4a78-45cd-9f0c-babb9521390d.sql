-- Drop the existing constraint that doesn't allow 'free' payment status
ALTER TABLE event_registrations 
DROP CONSTRAINT IF EXISTS event_registrations_payment_status_check;

-- Add updated constraint that includes 'free' as a valid payment status
ALTER TABLE event_registrations 
ADD CONSTRAINT event_registrations_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'free'));