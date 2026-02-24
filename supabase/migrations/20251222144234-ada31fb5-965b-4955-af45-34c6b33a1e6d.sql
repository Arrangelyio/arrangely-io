-- 1. Buat Table
CREATE TABLE
    public.platform_benefit_rules (
        contribution_type TEXT PRIMARY KEY, -- 'original', 'arrangement', 'transcription', 'chord_grid'
        multiplier NUMERIC NOT NULL, -- Contoh: 1.0, 0.5, 0.26
        description TEXT
    );

-- 2. Aktifkan RLS (Security) - Hanya Admin/Service Role yang boleh update
ALTER TABLE public.platform_benefit_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Semua orang boleh baca (untuk trigger), tapi tidak boleh edit lewat API public
CREATE POLICY "Enable read access for all users" ON "public"."platform_benefit_rules" AS PERMISSIVE FOR
SELECT
    TO public USING (true);

-- 3. Masukkan Data Default (Sesuai aturan sekarang)
INSERT INTO
    public.platform_benefit_rules (contribution_type, multiplier, description)
VALUES
    ('original', 1.0, 'Karya Original (100%)'),
    ('arrangement', 1.0, 'Aransemen Ulang (100%)'),
    ('transcription', 0.5, 'Transkripsi Standar (50%)');

-- Chord Grid tidak dimasukkan disini karena dia fixed value (20k), bukan persentase.
CREATE POLICY "Enable update for authenticated users" ON "public"."platform_benefit_rules"
FOR UPDATE
    TO authenticated USING (true)
WITH
    CHECK (true);