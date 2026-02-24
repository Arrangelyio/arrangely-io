-- Add assigned_song_id column to request_arrangements table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'request_arrangements' 
    AND column_name = 'assigned_song_id'
  ) THEN
    ALTER TABLE public.request_arrangements 
    ADD COLUMN assigned_song_id UUID REFERENCES public.songs(id);
  END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id;

CREATE OR REPLACE FUNCTION public.sync_email_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Update kolom email di profiles berdasarkan user_id dari auth.users
  UPDATE public.profiles
  SET email = u.email
  FROM auth.users u
  WHERE public.profiles.user_id = u.id
    AND public.profiles.id = NEW.id; -- hanya baris baru saja

  RETURN NEW;
END;
$$;


CREATE TRIGGER on_profile_insert_sync_email
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_email_on_profile_insert();
