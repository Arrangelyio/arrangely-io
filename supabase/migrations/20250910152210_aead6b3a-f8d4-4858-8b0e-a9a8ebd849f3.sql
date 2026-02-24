-- Add section_id to setlist_annotations table for per-section annotation support
ALTER TABLE public.setlist_annotations 
ADD COLUMN section_id uuid;

-- Add index for better query performance
CREATE INDEX idx_setlist_annotations_section 
ON public.setlist_annotations(setlist_id, song_id, section_id);

-- Add index for all sections queries
CREATE INDEX idx_setlist_annotations_all_sections 
ON public.setlist_annotations(setlist_id, song_id) 
WHERE section_id IS NULL;


CREATE OR REPLACE FUNCTION public.get_user_feature(
  user_id_param uuid,
  feature_key text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  feature_value text;
BEGIN
  -- Ambil value dari JSON features subscription yang masih valid
  SELECT sp.features::jsonb ->> feature_key
  INTO feature_value
  FROM public.subscriptions s
  JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = user_id_param
    AND s.status IN ('trialing', 'active', 'pending', 'trial_expired')
    AND NOW() >= s.current_period_start
    AND NOW() <= s.current_period_end
  ORDER BY CASE s.status
             WHEN 'trialing' THEN 1
             WHEN 'active' THEN 2
             WHEN 'pending' THEN 3
             WHEN 'trial_expired' THEN 4
           END,
           s.created_at DESC
  LIMIT 1;

  -- Kalau NULL, berarti default = false
  IF feature_value IS NULL THEN
    RETURN false;
  END IF;

  -- Cast text ke boolean
  RETURN (feature_value)::boolean;
END;
$$;


declare
  v_capacity int;
  v_registered int;
begin
  -- Lock row event
  select max_capacity, current_registrations
  into v_capacity, v_registered
  from events
  where id = p_event_id
  for update;

  if v_registered >= v_capacity then
    raise exception 'Quota habis untuk event ini';
  end if;

  -- Insert registrasi
  insert into event_registrations (
    event_id,
    user_id,
    booking_id,
    attendee_name,
    attendee_email,
    attendee_phone,
    qr_code,
    amount_paid,
    payment_status,
    status
  )
  values (
    p_event_id,
    p_user_id,
    p_booking_id,
    p_attendee_name,
    p_attendee_email,
    p_attendee_phone,
    p_qr_code,
    p_amount_paid,
    p_payment_status,
    p_status
  );


end;
