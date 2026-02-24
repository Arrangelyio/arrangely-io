-- Add foreign key constraints and unique constraint for event_ushers relationships
-- Ensures PostgREST can resolve relationships for nested selects

DO $$ BEGIN
  -- Add FK: event_ushers.user_id -> profiles.user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_ushers_user_id_fkey'
  ) THEN
    ALTER TABLE public.event_ushers
      ADD CONSTRAINT event_ushers_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(user_id)
      ON DELETE CASCADE;
  END IF;

  -- Add FK: event_ushers.event_id -> events.id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_ushers_event_id_fkey'
  ) THEN
    ALTER TABLE public.event_ushers
      ADD CONSTRAINT event_ushers_event_id_fkey
      FOREIGN KEY (event_id)
      REFERENCES public.events(id)
      ON DELETE CASCADE;
  END IF;

  -- Add unique constraint to prevent duplicate assignments
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'event_ushers_unique_event_user'
  ) THEN
    ALTER TABLE public.event_ushers
      ADD CONSTRAINT event_ushers_unique_event_user
      UNIQUE (event_id, user_id);
  END IF;
END $$;


CREATE OR REPLACE VIEW event_ushers_with_profiles AS
SELECT eu.*, p.display_name, p.avatar_url
FROM event_ushers eu
JOIN profiles p ON eu.user_id = p.user_id;
