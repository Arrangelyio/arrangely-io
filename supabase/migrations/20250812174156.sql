CREATE OR REPLACE FUNCTION public.add_library_add_benefit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  benefit_config RECORD;
  song_creator_id UUID;
BEGIN
  -- Ambil song_creator_id dari kolom user_original_id jika ada
  IF NEW.user_original_id IS NOT NULL THEN
    song_creator_id := NEW.user_original_id;
  ELSE
    SELECT user_id INTO song_creator_id
    FROM public.songs
    WHERE id = NEW.song_id
    LIMIT 1;
  END IF;

  -- Ambil konfigurasi benefit
  SELECT * INTO benefit_config
  FROM public.creator_benefit_configs
  WHERE creator_id = song_creator_id
    AND is_production = true
  LIMIT 1;

  -- Cek jika config ada, benefit > 0, dan aktif
  IF benefit_config.id IS NOT NULL
     AND benefit_config.benefit_per_library_add > 0
     AND public.is_benefit_config_active(benefit_config.id) THEN
    INSERT INTO public.creator_benefits (
      creator_id,
      benefit_type,
      amount,
      song_id,
      added_by_user_id,
      is_production
    ) VALUES (
      song_creator_id,
      'library_add',
      benefit_config.benefit_per_library_add,
      NEW.song_id,
      NEW.user_id,
      NEW.is_production
    );
  END IF;

  RETURN NEW;
END;
$$;
