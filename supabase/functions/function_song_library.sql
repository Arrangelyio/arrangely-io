create or replace function public.get_multiple_song_like_counts(song_ids uuid[])
returns table(song_id uuid, count bigint)
language sql
as $$
    select song_id, count(*) as count
    from song_likes
    where song_id = any(song_ids)
    group by song_id;
$$;

create or replace function public.get_user_liked_songs(user_id uuid, song_ids uuid[])
returns table(song_id uuid)
language sql
as $$
    select song_id
    from song_likes
    where user_id = $1 and song_id = any($2);
$$;

create or replace function public.get_user_followed_creators(user_id uuid, creator_ids uuid[])
returns table(creator_id uuid)
language sql
as $$
    select following_id as creator_id
    from user_follows
    where follower_id = $1 and following_id = any($2);
$$;

