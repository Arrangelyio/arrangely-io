-- Create event quota transaction history table
CREATE TABLE IF NOT EXISTS public.event_quota_transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_category_id UUID NOT NULL REFERENCES public.event_ticket_categories(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.event_payments(id) ON DELETE SET NULL,
  ticket_count INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('book', 'used', 'reversal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create index for faster queries
CREATE INDEX idx_quota_transaction_ticket_category ON public.event_quota_transaction_history(ticket_category_id);
CREATE INDEX idx_quota_transaction_payment ON public.event_quota_transaction_history(payment_id);
CREATE INDEX idx_quota_transaction_type ON public.event_quota_transaction_history(transaction_type);

-- Enable RLS
ALTER TABLE public.event_quota_transaction_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Event organizers can view quota transactions for their events"
  ON public.event_quota_transaction_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_ticket_categories etc
      JOIN public.events e ON etc.event_id = e.id
      WHERE etc.id = event_quota_transaction_history.ticket_category_id
      AND e.organizer_id = auth.uid()
    )
  );

CREATE POLICY "System can manage quota transactions"
  ON public.event_quota_transaction_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to book quota (reserve)
CREATE OR REPLACE FUNCTION book_event_quota(
  p_ticket_category_id UUID,
  p_payment_id UUID,
  p_ticket_count INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_available_quota INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT quota_remaining INTO v_available_quota
  FROM event_ticket_categories
  WHERE id = p_ticket_category_id
  FOR UPDATE;

  -- Check if enough quota available
  IF v_available_quota < p_ticket_count THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient quota',
      'available', v_available_quota,
      'requested', p_ticket_count
    );
  END IF;

  -- Deduct quota
  UPDATE event_ticket_categories
  SET quota_remaining = quota_remaining - p_ticket_count,
      updated_at = NOW()
  WHERE id = p_ticket_category_id;

  -- Create transaction record
  INSERT INTO event_quota_transaction_history (
    ticket_category_id,
    payment_id,
    ticket_count,
    transaction_type,
    notes
  ) VALUES (
    p_ticket_category_id,
    p_payment_id,
    p_ticket_count,
    'book',
    'Quota reserved for payment'
  ) RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'remaining_quota', v_available_quota - p_ticket_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark quota as used (payment successful)
CREATE OR REPLACE FUNCTION use_event_quota(
  p_payment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Update semua transaksi dengan payment_id yang sama dan masih 'book'
  UPDATE event_quota_transaction_history
  SET 
    transaction_type = 'used',
    notes = 'Quota confirmed after successful payment',
    updated_at = NOW()
  WHERE payment_id = p_payment_id
    AND transaction_type = 'book';

  -- Ambil jumlah baris yang diupdate
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No book transaction found for this payment'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to reverse quota (payment failed/expired)
CREATE OR REPLACE FUNCTION reverse_event_quota(
  p_payment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_transaction_record RECORD;
  v_new_transaction_id UUID;
  v_already_reversed BOOLEAN;
BEGIN
  -- Check if already reversed
  SELECT EXISTS(
    SELECT 1 FROM event_quota_transaction_history
    WHERE payment_id = p_payment_id
    AND transaction_type = 'reversal'
  ) INTO v_already_reversed;

  IF v_already_reversed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quota already reversed for this payment'
    );
  END IF;

  -- Find the book transaction
  SELECT * INTO v_transaction_record
  FROM event_quota_transaction_history
  WHERE payment_id = p_payment_id
  AND transaction_type = 'book'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No book transaction found for this payment'
    );
  END IF;

  -- Check if already used (paid)
  IF EXISTS(
    SELECT 1 FROM event_quota_transaction_history
    WHERE payment_id = p_payment_id
    AND transaction_type = 'used'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot reverse - quota already used (payment completed)'
    );
  END IF;

  -- Return quota to pool
  UPDATE event_ticket_categories
  SET remaining_quota = remaining_quota + v_transaction_record.ticket_count,
      updated_at = NOW()
  WHERE id = v_transaction_record.ticket_category_id;

  -- Create reversal transaction
  INSERT INTO event_quota_transaction_history (
    ticket_category_id,
    payment_id,
    ticket_count,
    transaction_type,
    notes
  ) VALUES (
    v_transaction_record.ticket_category_id,
    p_payment_id,
    v_transaction_record.ticket_count,
    'reversal',
    'Quota returned due to payment failure/expiration'
  ) RETURNING id INTO v_new_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_new_transaction_id,
    'returned_quota', v_transaction_record.ticket_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle late payment (expired but then paid)
CREATE OR REPLACE FUNCTION handle_late_event_payment(
  p_payment_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_transaction_record RECORD;
  v_reversal_exists BOOLEAN;
  v_category_id UUID;
  v_ticket_count INTEGER;
  v_available_quota INTEGER;
BEGIN
  -- Get the original book transaction
  SELECT * INTO v_transaction_record
  FROM event_quota_transaction_history
  WHERE payment_id = p_payment_id
  AND transaction_type = 'book'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No book transaction found'
    );
  END IF;

  v_category_id := v_transaction_record.ticket_category_id;
  v_ticket_count := v_transaction_record.ticket_count;

  -- Check if it was reversed
  SELECT EXISTS(
    SELECT 1 FROM event_quota_transaction_history
    WHERE payment_id = p_payment_id
    AND transaction_type = 'reversal'
  ) INTO v_reversal_exists;

  IF v_reversal_exists THEN
    -- Payment was expired and reversed, now we need to re-book
    -- Lock and check quota
    SELECT quota_remaining INTO v_available_quota
    FROM event_ticket_categories
    WHERE id = v_category_id
    FOR UPDATE;

    IF v_available_quota < v_ticket_count THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient quota for late payment',
        'available', v_available_quota,
        'required', v_ticket_count
      );
    END IF;

    -- Deduct quota again
    UPDATE event_ticket_categories
    SET quota_remaining = quota_remaining - v_ticket_count,
        updated_at = NOW()
    WHERE id = v_category_id;
  END IF;

  -- Mark as used
  INSERT INTO event_quota_transaction_history (
    ticket_category_id,
    payment_id,
    ticket_count,
    transaction_type,
    notes
  ) VALUES (
    v_category_id,
    p_payment_id,
    v_ticket_count,
    'used',
    'Late payment confirmed after expiration'
  );

  RETURN jsonb_build_object(
    'success', true,
    'was_reversed', v_reversal_exists
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;