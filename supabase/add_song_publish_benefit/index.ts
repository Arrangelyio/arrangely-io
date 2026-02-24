CREATE OR REPLACE FUNCTION public.add_song_publish_benefit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  benefit_config RECORD;
  user_profile RECORD;
  final_amount NUMERIC := 0;
BEGIN
  -- 1. Cek apakah lagu dipublish (Public)
  IF NEW.is_public = true THEN
  
    -- 2. Ambil konfigurasi benefit creator
    SELECT * INTO benefit_config
    FROM public.creator_benefit_configs
    WHERE creator_id = NEW.user_id 
    AND is_production = true
    LIMIT 1;

    -- 3. Ambil Tipe Creator dari Profile
    SELECT creator_type INTO user_profile
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    -- 4. Cek apakah config valid dan aktif
    IF benefit_config.id IS NOT NULL 
       AND public.is_benefit_config_active(benefit_config.id) 
       AND benefit_config.benefit_per_song_publish > 0 THEN

      -- ====================================================
      -- LOGIC CALCULATOR
      -- ====================================================
      
      -- PRIORITAS 1: Creator Arrangely (Internal)
      IF user_profile.creator_type = 'creator_arrangely' THEN
         final_amount := benefit_config.benefit_per_song_publish;

      -- PRIORITAS 2: Creator Professional
      ELSIF user_profile.creator_type = 'creator_professional' THEN
         -- A. Jika Chord Grid -> Fixed 20.000
         IF NEW.theme = 'chord_grid' THEN
            final_amount := 20000;
         -- B. Jika Chord Lyric / Lainnya -> Cek Contribution Type
         ELSE
            IF NEW.contribution_type IN ('original', 'arrangement') THEN
               final_amount := benefit_config.benefit_per_song_publish; 
            ELSE
               final_amount := benefit_config.benefit_per_song_publish / 2;
            END IF;
         END IF;

      -- PRIORITAS 3: Creator Biasa / Lainnya
      ELSE
         final_amount := 0;
      END IF;

      -- ====================================================
      -- EKSEKUSI INSERT
      -- ====================================================
      
      IF final_amount > 0 THEN
        INSERT INTO public.creator_benefits (
          creator_id,
          benefit_type,
          amount,
          song_id,
          is_production,
          created_at
        ) VALUES (
          NEW.user_id,
          'song_publish', -- <--- SAYA UBAH KEMBALI KE TIPE STANDAR AGAR TIDAK ERROR
          final_amount,
          NEW.id,
          NEW.is_production,
          NOW()
        );
      END IF;

    END IF; 
  END IF; 
  
  RETURN NEW;
END;
$$;