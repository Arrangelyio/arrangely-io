create or replace function register_event(
  p_event_id uuid,
  p_user_id uuid,
  p_booking_id text,
  p_attendee_name text,
  p_attendee_email text,
  p_attendee_phone text,
  p_qr_code text,
  p_amount_paid numeric,
  p_payment_status text,
  p_status text
)
returns void as $$
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

  -- Update counter di events
  update events
  set current_registrations = current_registrations + 1
  where id = p_event_id;

end;
$$ language plpgsql security definer;

-- Admin bisa akses semua profile
create policy "Admin can view all profiles"
on public.profiles
for select
to public
using (
    ((user_id = auth.uid()) OR (get_user_role(auth.uid()) = 'admin'::user_role))
);
