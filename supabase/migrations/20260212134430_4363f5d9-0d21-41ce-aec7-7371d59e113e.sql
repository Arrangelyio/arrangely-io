
-- Create library_fraud_alerts table for reporting only
CREATE TABLE public.library_fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN ('self_add', 'bulk_same_creator', 'rapid_burst', 'new_account_targeting')),
  user_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  song_count integer NOT NULL DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.library_fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can read all alerts
CREATE POLICY "Admins can view fraud alerts"
ON public.library_fraud_alerts
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Admins can update alerts (resolve)
CREATE POLICY "Admins can update fraud alerts"
ON public.library_fraud_alerts
FOR UPDATE
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Edge function inserts via service_role, but allow admin insert too
CREATE POLICY "Admins can insert fraud alerts"
ON public.library_fraud_alerts
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user(auth.uid()));

-- Index for common queries
CREATE INDEX idx_fraud_alerts_unresolved ON public.library_fraud_alerts (is_resolved, severity) WHERE is_resolved = false;
CREATE INDEX idx_fraud_alerts_user ON public.library_fraud_alerts (user_id);
CREATE INDEX idx_fraud_alerts_creator ON public.library_fraud_alerts (creator_id);


create or replace function add_song_to_library_atomic(
  p_user_id uuid,
  p_original_song_id uuid
)
returns json
language plpgsql
as $$
declare
  v_new_song_id uuid;
begin

  ------------------------------------------------------------------
  -- 1️⃣ Validate library limit
  ------------------------------------------------------------------
  if not validate_library_limit(p_user_id) then
    return json_build_object(
      'success', false,
      'error', json_build_object(
        'message', 'Library limit reached. Upgrade your subscription.'
      )
    );
  end if;

  ------------------------------------------------------------------
  -- 2️⃣ Check duplicate
  ------------------------------------------------------------------
  if exists (
    select 1
    from user_library_actions
    where user_id = p_user_id
    and song_original_id = p_original_song_id
  ) then
    return json_build_object(
      'success', false,
      'error', json_build_object(
        'message', 'Song already in library'
      )
    );
  end if;

  ------------------------------------------------------------------
  -- 3️⃣ Insert new song copy
  ------------------------------------------------------------------
  insert into songs (
    title,
    artist,
    current_key,
    original_key,
    tempo,
    tags,
    is_public,
    user_id,
    time_signature,
    capo,
    theme,
    notes,
    youtube_link,
    youtube_thumbnail,
    original_creator_id,
    sequencer_drive_link,
    sequencer_price
  )
  select
    s.title,
    s.artist,
    s.current_key,
    s.original_key,
    s.tempo,
    s.tags,
    false,
    p_user_id,
    s.time_signature,
    s.capo,
    s.theme,
    s.notes,
    s.youtube_link,
    s.youtube_thumbnail,
    coalesce(s.original_creator_id, s.user_id),
    s.sequencer_drive_link,
    s.sequencer_price
  from songs s
  where s.id = p_original_song_id
  returning id into v_new_song_id;

  if v_new_song_id is null then
    return json_build_object(
      'success', false,
      'error', json_build_object(
        'message', 'Original song not found'
      )
    );
  end if;

  ------------------------------------------------------------------
  -- 4️⃣ Copy sections WITH SAFE ID MAPPING
  ------------------------------------------------------------------

  create temporary table tmp_section_map (
    old_id uuid,
    new_id uuid
  ) on commit drop;

  with ordered_old as (
    select id, row_number() over (order by id) as rn
    from song_sections
    where song_id = p_original_song_id
  ),
  inserted as (
    insert into song_sections (
      song_id,
      section_type,
      name,
      lyrics,
      chords,
      bar_count,
      section_time_signature
    )
    select
      v_new_song_id,
      s.section_type,
      s.name,
      s.lyrics,
      s.chords,
      s.bar_count,
      s.section_time_signature
    from song_sections s
    where s.song_id = p_original_song_id
    order by s.id
    returning id
  ),
  ordered_new as (
    select id, row_number() over () as rn
    from inserted
  )
  insert into tmp_section_map (old_id, new_id)
  select o.id, n.id
  from ordered_old o
  join ordered_new n on o.rn = n.rn;

  ------------------------------------------------------------------
  -- 5️⃣ Copy arrangements USING NEW SECTION IDs
  ------------------------------------------------------------------

  insert into arrangements (
    song_id,
    section_id,
    position,
    repeat_count,
    notes
  )
  select
    v_new_song_id,
    m.new_id,
    a.position,
    a.repeat_count,
    a.notes
  from arrangements a
  join tmp_section_map m
    on a.section_id = m.old_id
  where a.song_id = p_original_song_id;

  ------------------------------------------------------------------
  -- 6️⃣ Record library action
  ------------------------------------------------------------------

  insert into user_library_actions (
    user_id,
    song_id,
    song_original_id,
    action_type,
    is_production
  )
  values (
    p_user_id,
    v_new_song_id,
    p_original_song_id,
    'add_to_library',
    true
  );

  ------------------------------------------------------------------
  -- 7️⃣ Success response
  ------------------------------------------------------------------

  return json_build_object(
    'success', true,
    'song_id', v_new_song_id
  );

exception
  when others then
    return json_build_object(
      'success', false,
      'error', json_build_object(
        'message', SQLERRM
      )
    );
end;
$$;
