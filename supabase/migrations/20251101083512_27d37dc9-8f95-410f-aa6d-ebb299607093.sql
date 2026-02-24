-- Update book_event_quota function to use remaining_quota
CREATE OR REPLACE FUNCTION book_event_quota(
  p_ticket_category_id UUID,
  p_payment_id UUID,
  p_ticket_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_current_quota INTEGER;
  v_new_quota INTEGER;
BEGIN
  -- Lock the row for update
  SELECT remaining_quota INTO v_current_quota
  FROM event_ticket_categories
  WHERE id = p_ticket_category_id
  FOR UPDATE;

  -- Check if enough quota is available
  IF v_current_quota < p_ticket_count THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient quota available',
      'available_quota', v_current_quota,
      'requested_quota', p_ticket_count
    );
  END IF;

  -- Deduct quota
  v_new_quota := v_current_quota - p_ticket_count;
  
  UPDATE event_ticket_categories
  SET remaining_quota = v_new_quota,
      updated_at = NOW()
  WHERE id = p_ticket_category_id;

  -- Log the transaction
  INSERT INTO event_quota_transaction_history (
    ticket_category_id,
    payment_id,
    transaction_type,
    ticket_count,
    notes
  ) VALUES (
    p_ticket_category_id,
    p_payment_id,
    'book',
    p_ticket_count,
    'Quota booked for payment'
  );

  RETURN jsonb_build_object(
    'success', true,
    'remaining_quota', v_new_quota,
    'booked_count', p_ticket_count
  );
END;
$$ LANGUAGE plpgsql;

-- Update reverse_event_quota function to use remaining_quota
-- Function to reverse quota (payment failed/expired)
CREATE OR REPLACE FUNCTION reverse_event_quota(
  p_payment_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_transaction_record RECORD;
  v_updated_count INTEGER;
BEGIN
  -- Find the booked transaction (the one we want to reverse)
  SELECT *
  INTO v_transaction_record
  FROM event_quota_transaction_history
  WHERE payment_id = p_payment_id
    AND transaction_type = 'book'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If not found, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No booking transaction found for this payment'
    );
  END IF;

  -- Check if already used (paid)
  IF EXISTS (
    SELECT 1
    FROM event_quota_transaction_history
    WHERE payment_id = p_payment_id
      AND transaction_type = 'used'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot reverse — quota already used (payment completed)'
    );
  END IF;

  -- Return the quota to the pool
  UPDATE event_ticket_categories
  SET remaining_quota = remaining_quota + v_transaction_record.ticket_count,
      updated_at = NOW()
  WHERE id = v_transaction_record.ticket_category_id;

  -- Instead of inserting new reversal record, update the existing one
  UPDATE event_quota_transaction_history
  SET transaction_type = 'reversal',
      notes = 'Quota returned due to payment failure/expiration',
      updated_at = NOW()
  WHERE payment_id = p_payment_id
    AND ticket_category_id = v_transaction_record.ticket_category_id
    AND transaction_type = 'book';

  -- Get number of affected rows
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No booking record found to update'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'reversed_ticket_category_id', v_transaction_record.ticket_category_id,
    'returned_quota', v_transaction_record.ticket_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_late_event_payment function to use remaining_quota
CREATE OR REPLACE FUNCTION handle_late_event_payment(
  p_ticket_category_id UUID,
  p_payment_id UUID,
  p_ticket_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_current_quota INTEGER;
  v_new_quota INTEGER;
  v_max_quota INTEGER;
BEGIN
  -- Lock the row for update
  SELECT remaining_quota, max_quota INTO v_current_quota, v_max_quota
  FROM event_ticket_categories
  WHERE id = p_ticket_category_id
  FOR UPDATE;

  -- Deduct quota (can go negative for late payments)
  v_new_quota := v_current_quota - p_ticket_count;
  
  UPDATE event_ticket_categories
  SET remaining_quota = v_new_quota,
      updated_at = NOW()
  WHERE id = p_ticket_category_id;

  -- Log the transaction
  INSERT INTO event_quota_transaction_history (
    ticket_category_id,
    payment_id,
    transaction_type,
    ticket_count,
    notes
  ) VALUES (
    p_ticket_category_id,
    p_payment_id,
    'late_payment',
    p_ticket_count,
    'Late payment processed - quota may be overbooked'
  );

  RETURN jsonb_build_object(
    'success', true,
    'remaining_quota', v_new_quota,
    'is_overbooked', v_new_quota < 0,
    'used_count', p_ticket_count
  );
END;
$$ LANGUAGE plpgsql;


ALTER TABLE event_quota_transaction_history
DROP CONSTRAINT IF EXISTS event_quota_transaction_history_payment_id_fkey,
ADD CONSTRAINT event_quota_transaction_history_payment_id_fkey
FOREIGN KEY (payment_id)
REFERENCES payments(id)
ON DELETE CASCADE;

