create table public.section_comments (
  id uuid default gen_random_uuid() primary key,
  
  -- Relasi ke Lagu & Section
  song_id uuid references public.songs(id) on delete cascade not null,
  section_id uuid references public.song_sections(id) on delete cascade not null,
  
  -- Relasi ke User (Ini yang BENAR: Link ke profiles.user_id)
  user_id uuid references public.profiles(user_id) on delete cascade not null,
  
  content text not null,
  created_at timestamptz default now()
);


-- Enable RLS
alter table public.section_comments enable row level security;

-- Policy 1: Semua orang bisa BACA komentar
create policy "Public Read Comments" 
  on public.section_comments for select 
  using (true);

-- Policy 2: User yang login bisa POST komentar
create policy "Authenticated Insert Comments" 
  on public.section_comments for insert 
  with check (auth.uid() = user_id);

-- Policy 3: User bisa HAPUS komentar sendiri
create policy "Owner Delete Comments" 
  on public.section_comments for delete 
  using (auth.uid() = user_id);



  -- 1. Tambah kolom image_url ke tabel comments
ALTER TABLE public.section_comments 
ADD COLUMN image_url text;

-- 2. Buat Storage Bucket baru bernama 'comment-attachments'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comment-attachments', 'comment-attachments', true);

-- 3. Policy: Semua orang bisa LIHAT gambar (Public Read)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'comment-attachments' );

-- 4. Policy: User yang login bisa UPLOAD gambar
CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'comment-attachments' AND auth.role() = 'authenticated' );

-- 5. Policy: User bisa DELETE gambarnya sendiri (Opsional, good practice)
CREATE POLICY "Owner Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'comment-attachments' AND auth.uid() = owner );


-- 1. Tambah kolom image_url ke tabel messages
ALTER TABLE public.messages 
ADD COLUMN image_url text;

-- 2. Buat Storage Bucket untuk chat
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true);

-- 3. Policy: Semua user login bisa LIHAT gambar chat
CREATE POLICY "Public Read Chat Images" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' );

-- 4. Policy: Semua user login bisa UPLOAD gambar chat
CREATE POLICY "Authenticated Upload Chat Images" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'chat-attachments' AND auth.role() = 'authenticated' );