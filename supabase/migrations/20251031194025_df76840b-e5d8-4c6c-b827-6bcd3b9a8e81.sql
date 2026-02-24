-- Add missing columns to payments table for event payment support
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'lesson' CHECK (payment_type IN ('lesson', 'event', 'subscription', 'one_time'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ticket_count INTEGER DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS snap_token TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS snap_redirect_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS original_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update existing event payment records to have payment_type = 'event'
UPDATE payments 
SET payment_type = 'event',
    event_id = COALESCE(payments.event_id, ep.event_id),
    ticket_count = COALESCE(payments.ticket_count, ep.ticket_count),
    snap_token = COALESCE(payments.snap_token, ep.snap_token),
    snap_redirect_url = COALESCE(payments.snap_redirect_url, ep.snap_redirect_url),
    expires_at = COALESCE(payments.expires_at, ep.expires_at),
    original_amount = COALESCE(payments.original_amount, ep.original_amount),
    discount_code_id = COALESCE(payments.discount_code_id, ep.discount_code_id),
    metadata = COALESCE(payments.metadata, ep.metadata, '{}'::jsonb)
FROM event_payments ep
WHERE payments.id = ep.id;

-- Update RLS policies for payments table to include event payments
DROP POLICY IF EXISTS "Users can view event payments" ON payments;
CREATE POLICY "Users can view event payments"
  ON payments FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = payments.event_id
      AND events.organizer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event organizers can view payments for their events" ON payments;
CREATE POLICY "Event organizers can view payments for their events"
  ON payments FOR SELECT
  USING (
    payment_type = 'event' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = payments.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Update the expire_event_payments function to work with payments table
CREATE OR REPLACE FUNCTION expire_event_payments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update expired event payments
  WITH expired AS (
    UPDATE payments
    SET status = 'expired'
    WHERE payment_type = 'event'
      AND status = 'pending'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;

  -- Release quota for expired payments
  PERFORM release_expired_payment_quota(id)
  FROM payments
  WHERE payment_type = 'event'
    AND status = 'expired'
    AND updated_at >= NOW() - INTERVAL '1 minute';

  RETURN expired_count;
END;
$$;