ALTER TABLE public.user_library_actions
ADD CONSTRAINT fk_user_library_actions_songs FOREIGN KEY (song_id) REFERENCES public.songs (id) ON DELETE CASCADE;