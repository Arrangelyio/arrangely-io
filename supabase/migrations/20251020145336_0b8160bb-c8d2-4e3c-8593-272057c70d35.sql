-- Add sample tier assessment questions in Bahasa Indonesia  
-- Fixed: both sub_category and instrument are required (use 'general' for non-instrument questions)

-- Guitar Questions
INSERT INTO tier_assessment_questions (category, sub_category, tier_level, instrument, question_text, options, is_production) VALUES
('instrument', 'guitar', 1, 'guitar', 'Apa itu chord mayor?', 
'[{"id": "A", "text": "Chord yang terdengar sedih", "isCorrect": false}, {"id": "B", "text": "Chord yang terdengar ceria dan stabil", "isCorrect": true}, {"id": "C", "text": "Chord dengan 4 nada", "isCorrect": false}, {"id": "D", "text": "Chord tanpa nada dasar", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 1, 'guitar', 'Berapa jumlah senar pada gitar standar?', 
'[{"id": "A", "text": "4 senar", "isCorrect": false}, {"id": "B", "text": "5 senar", "isCorrect": false}, {"id": "C", "text": "6 senar", "isCorrect": true}, {"id": "D", "text": "7 senar", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 1, 'guitar', 'Apa fungsi capo pada gitar?', 
'[{"id": "A", "text": "Mengganti senar", "isCorrect": false}, {"id": "B", "text": "Mengubah nada dasar/kunci lagu", "isCorrect": true}, {"id": "C", "text": "Membersihkan gitar", "isCorrect": false}, {"id": "D", "text": "Mempercantik gitar", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 2, 'guitar', 'Bagaimana cara membentuk chord sus4?', 
'[{"id": "A", "text": "Root - 4th - 5th", "isCorrect": true}, {"id": "B", "text": "Root - 3rd - 5th", "isCorrect": false}, {"id": "C", "text": "Root - 2nd - 5th", "isCorrect": false}, {"id": "D", "text": "Root - 3rd - 7th", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 2, 'guitar', 'Apa yang dimaksud dengan teknik hammer-on?', 
'[{"id": "A", "text": "Memukul gitar dengan keras", "isCorrect": false}, {"id": "B", "text": "Menekan senar tanpa memetik ulang", "isCorrect": true}, {"id": "C", "text": "Memetik dua senar bersamaan", "isCorrect": false}, {"id": "D", "text": "Menggunakan pick dengan kuat", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 3, 'guitar', 'Apa fungsi mode mixolydian dalam improvisasi?', 
'[{"id": "A", "text": "Memberikan nuansa blues dan rock", "isCorrect": true}, {"id": "B", "text": "Membuat lagu terdengar sedih", "isCorrect": false}, {"id": "C", "text": "Mengganti tangga nada minor", "isCorrect": false}, {"id": "D", "text": "Hanya untuk musik klasik", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 3, 'guitar', 'Bagaimana cara melakukan sweep picking yang efektif?', 
'[{"id": "A", "text": "Memetik senar secara acak", "isCorrect": false}, {"id": "B", "text": "Menggunakan gerakan pick kontinyu tersinkronisasi dengan tangan kiri", "isCorrect": true}, {"id": "C", "text": "Hanya menggunakan downstroke", "isCorrect": false}, {"id": "D", "text": "Memetik semua senar bersamaan", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 4, 'guitar', 'Bagaimana reharmonisasi memengaruhi emosi lagu?', 
'[{"id": "A", "text": "Hanya mengubah tempo", "isCorrect": false}, {"id": "B", "text": "Mengganti chord dengan alternatif kompleks untuk ubah warna harmoni", "isCorrect": true}, {"id": "C", "text": "Tidak ada pengaruh", "isCorrect": false}, {"id": "D", "text": "Hanya mengubah melodi", "isCorrect": false}]'::jsonb, true),

('instrument', 'guitar', 4, 'guitar', 'Apa peran counterpoint dalam aransemen gitar fingerstyle?', 
'[{"id": "A", "text": "Menciptakan melodi independen yang saling melengkapi", "isCorrect": true}, {"id": "B", "text": "Menambah volume", "isCorrect": false}, {"id": "C", "text": "Mengganti bass line", "isCorrect": false}, {"id": "D", "text": "Hanya untuk lagu klasik", "isCorrect": false}]'::jsonb, true);

-- Piano, Bass, Drum, Vocals, Saxophone
INSERT INTO tier_assessment_questions (category, sub_category, tier_level, instrument, question_text, options, is_production) VALUES
('instrument', 'piano', 1, 'piano', 'Berapa jumlah tuts hitam dan putih pada piano standar?', 
'[{"id": "A", "text": "52 putih, 36 hitam", "isCorrect": true}, {"id": "B", "text": "50 putih, 40 hitam", "isCorrect": false}, {"id": "C", "text": "60 putih, 30 hitam", "isCorrect": false}, {"id": "D", "text": "48 putih, 36 hitam", "isCorrect": false}]'::jsonb, true),

('instrument', 'piano', 1, 'piano', 'Apa fungsi pedal sustain pada piano?', 
'[{"id": "A", "text": "Membuat suara lebih keras", "isCorrect": false}, {"id": "B", "text": "Mempertahankan nada agar bergema lebih lama", "isCorrect": true}, {"id": "C", "text": "Menghentikan semua nada", "isCorrect": false}, {"id": "D", "text": "Mengubah nada dasar", "isCorrect": false}]'::jsonb, true),

('instrument', 'bass', 1, 'bass', 'Apa fungsi utama bass dalam band?', 
'[{"id": "A", "text": "Mainkan melodi utama", "isCorrect": false}, {"id": "B", "text": "Berikan fondasi harmoni dan ritme", "isCorrect": true}, {"id": "C", "text": "Ganti drum", "isCorrect": false}, {"id": "D", "text": "Hanya dekorasi", "isCorrect": false}]'::jsonb, true),

('instrument', 'drum', 1, 'drum', 'Apa itu time signature 4/4?', 
'[{"id": "A", "text": "4 ketukan per bar dengan quarter note sebagai satu ketukan", "isCorrect": true}, {"id": "B", "text": "4 bar dalam satu lagu", "isCorrect": false}, {"id": "C", "text": "Tempo 4 BPM", "isCorrect": false}, {"id": "D", "text": "4 instrumen", "isCorrect": false}]'::jsonb, true),

('instrument', 'vocals', 1, 'vocals', 'Apa itu vocal range?', 
'[{"id": "A", "text": "Jarak nada terendah hingga tertinggi bisa dinyanyikan", "isCorrect": true}, {"id": "B", "text": "Kecepatan bernyanyi", "isCorrect": false}, {"id": "C", "text": "Volume suara", "isCorrect": false}, {"id": "D", "text": "Durasi bernyanyi", "isCorrect": false}]'::jsonb, true),

('instrument', 'saxophone', 1, 'saxophone', 'Apa fungsi reed pada saxophone?', 
'[{"id": "A", "text": "Bergetar hasilkan suara", "isCorrect": true}, {"id": "B", "text": "Bersihkan saxophone", "isCorrect": false}, {"id": "C", "text": "Simpan air liur", "isCorrect": false}, {"id": "D", "text": "Dekorasi", "isCorrect": false}]'::jsonb, true);

-- Theory Questions (instrument = 'general')
INSERT INTO tier_assessment_questions (category, sub_category, tier_level, instrument, question_text, options, is_production) VALUES
('theory', 'theory', 1, 'general', 'Apa itu interval dalam musik?', 
'[{"id": "A", "text": "Jarak antara dua nada", "isCorrect": true}, {"id": "B", "text": "Kecepatan musik", "isCorrect": false}, {"id": "C", "text": "Volume musik", "isCorrect": false}, {"id": "D", "text": "Jenis alat musik", "isCorrect": false}]'::jsonb, true),

('theory', 'theory', 1, 'general', 'Berapa jumlah nada dalam tangga nada mayor?', 
'[{"id": "A", "text": "5 nada", "isCorrect": false}, {"id": "B", "text": "7 nada", "isCorrect": true}, {"id": "C", "text": "8 nada", "isCorrect": false}, {"id": "D", "text": "12 nada", "isCorrect": false}]'::jsonb, true),

('theory', 'theory', 2, 'general', 'Apa perbedaan chord mayor dan minor?', 
'[{"id": "A", "text": "Interval ketiga: mayor = major 3rd, minor = minor 3rd", "isCorrect": true}, {"id": "B", "text": "Jumlah nada beda", "isCorrect": false}, {"id": "C", "text": "Volume beda", "isCorrect": false}, {"id": "D", "text": "Tidak ada beda", "isCorrect": false}]'::jsonb, true),

('theory', 'theory', 3, 'general', 'Apa fungsi chord ii-V-I dalam progressi jazz?', 
'[{"id": "A", "text": "Progressi harmoni umum ciptakan resolusi kuat", "isCorrect": true}, {"id": "B", "text": "Hanya untuk klasik", "isCorrect": false}, {"id": "C", "text": "Tidak ada fungsi", "isCorrect": false}, {"id": "D", "text": "Ganti melodi", "isCorrect": false}]'::jsonb, true),

('theory', 'theory', 4, 'general', 'Bagaimana modal interchange perkaya komposisi?', 
'[{"id": "A", "text": "Pinjam chord dari mode paralel tambah warna harmoni", "isCorrect": true}, {"id": "B", "text": "Ganti semua jadi minor", "isCorrect": false}, {"id": "C", "text": "Hanya ubah melodi", "isCorrect": false}, {"id": "D", "text": "Tidak ada pengaruh", "isCorrect": false}]'::jsonb, true);

-- Production Questions (instrument = 'general')
INSERT INTO tier_assessment_questions (category, sub_category, tier_level, instrument, question_text, options, is_production) VALUES
('production', 'production', 1, 'general', 'Apa itu DAW (Digital Audio Workstation)?', 
'[{"id": "A", "text": "Software rekam, edit, dan produksi musik", "isCorrect": true}, {"id": "B", "text": "Alat musik digital", "isCorrect": false}, {"id": "C", "text": "Jenis microphone", "isCorrect": false}, {"id": "D", "text": "Format file audio", "isCorrect": false}]'::jsonb, true),

('production', 'production', 2, 'general', 'Apa fungsi compressor dalam mixing?', 
'[{"id": "A", "text": "Kontrol dinamika kurangi beda volume bagian keras-lembut", "isCorrect": true}, {"id": "B", "text": "Tambah reverb", "isCorrect": false}, {"id": "C", "text": "Ubah pitch", "isCorrect": false}, {"id": "D", "text": "Hapus noise", "isCorrect": false}]'::jsonb, true),

('production', 'production', 3, 'general', 'Apa teknik sidechain compression umum?', 
'[{"id": "A", "text": "Buat bass ducking saat kick drum hits untuk clarity", "isCorrect": true}, {"id": "B", "text": "Tambah volume semua", "isCorrect": false}, {"id": "C", "text": "Hapus semua low freq", "isCorrect": false}, {"id": "D", "text": "Ubah tempo", "isCorrect": false}]'::jsonb, true),

('production', 'production', 4, 'general', 'Bagaimana mastering engineer gunakan mid-side EQ untuk spatial imaging?', 
'[{"id": "A", "text": "Proses sinyal mono (mid) dan stereo (side) terpisah kontrol width-depth", "isCorrect": true}, {"id": "B", "text": "Hanya tingkatkan volume", "isCorrect": false}, {"id": "C", "text": "Ganti semua instrument", "isCorrect": false}, {"id": "D", "text": "Tidak pengaruh spatial", "isCorrect": false}]'::jsonb, true);

-- Songwriting Questions (instrument = 'general')
INSERT INTO tier_assessment_questions (category, sub_category, tier_level, instrument, question_text, options, is_production) VALUES
('songwriting', 'songwriting', 1, 'general', 'Apa struktur lagu paling umum?', 
'[{"id": "A", "text": "Verse-Chorus-Verse-Chorus-Bridge-Chorus", "isCorrect": true}, {"id": "B", "text": "Hanya chorus", "isCorrect": false}, {"id": "C", "text": "Tidak ada struktur", "isCorrect": false}, {"id": "D", "text": "Bridge-Verse-Bridge", "isCorrect": false}]'::jsonb, true),

('songwriting', 'songwriting', 2, 'general', 'Apa fungsi hook dalam lagu?', 
'[{"id": "A", "text": "Bagian mudah diingat tarik perhatian pendengar", "isCorrect": true}, {"id": "B", "text": "Bagian paling panjang", "isCorrect": false}, {"id": "C", "text": "Bagian intro saja", "isCorrect": false}, {"id": "D", "text": "Tidak ada fungsi", "isCorrect": false}]'::jsonb, true),

('songwriting', 'songwriting', 3, 'general', 'Bagaimana storytelling efektif dalam lirik?', 
'[{"id": "A", "text": "Gunakan imagery, emosi, dan narasi koheren dengan arc dramatis", "isCorrect": true}, {"id": "B", "text": "Gunakan kata sulit", "isCorrect": false}, {"id": "C", "text": "Buat lirik sangat panjang", "isCorrect": false}, {"id": "D", "text": "Hindari emosi", "isCorrect": false}]'::jsonb, true),

('songwriting', 'songwriting', 4, 'general', 'Bagaimana kontras harmonik tingkatkan emosi komposisi?', 
'[{"id": "A", "text": "Gunakan perubahan mode, modulasi, unexpected chord ciptakan tension-release", "isCorrect": true}, {"id": "B", "text": "Chord sama terus", "isCorrect": false}, {"id": "C", "text": "Hindari variasi harmoni", "isCorrect": false}, {"id": "D", "text": "Hanya fokus melodi", "isCorrect": false}]'::jsonb, true);

-- Worship Leader Questions (instrument = 'general')
INSERT INTO tier_assessment_questions (category, sub_category, tier_level, instrument, question_text, options, is_production) VALUES
('worship_leader', 'worship_leader', 1, 'general', 'Apa peran utama worship leader?', 
'[{"id": "A", "text": "Pimpin jemaat dalam penyembahan ciptakan atmosfer spiritual", "isCorrect": true}, {"id": "B", "text": "Hanya nyanyi di depan", "isCorrect": false}, {"id": "C", "text": "Mainkan semua instrumen", "isCorrect": false}, {"id": "D", "text": "Atur sound system", "isCorrect": false}]'::jsonb, true),

('worship_leader', 'worship_leader', 2, 'general', 'Bagaimana bangun setlist efektif untuk ibadah?', 
'[{"id": "A", "text": "Pertimbangkan flow emosional, tema, dinamika dari opening-closing", "isCorrect": true}, {"id": "B", "text": "Pilih lagu acak", "isCorrect": false}, {"id": "C", "text": "Hanya lagu cepat", "isCorrect": false}, {"id": "D", "text": "Tidak perlu rencana", "isCorrect": false}]'::jsonb, true),

('worship_leader', 'worship_leader', 3, 'general', 'Bagaimana aransemen lagu worship untuk tim beda skill level?', 
'[{"id": "A", "text": "Sederhanakan bagian sulit pertahankan feel, gunakan chart clear", "isCorrect": true}, {"id": "B", "text": "Aransemen sangat kompleks", "isCorrect": false}, {"id": "C", "text": "Tidak perlu aransemen", "isCorrect": false}, {"id": "D", "text": "Hanya fokus penyanyi", "isCorrect": false}]'::jsonb, true),

('worship_leader', 'worship_leader', 4, 'general', 'Bagaimana spiritual leadership pengaruhi efektivitas worship ministry?', 
'[{"id": "A", "text": "Keaslian spiritual dan kehidupan doa pribadi ciptakan atmosfer genuine-transformatif", "isCorrect": true}, {"id": "B", "text": "Hanya teknik vokal penting", "isCorrect": false}, {"id": "C", "text": "Tidak ada hubungan", "isCorrect": false}, {"id": "D", "text": "Hanya penampilan panggung", "isCorrect": false}]'::jsonb, true);
