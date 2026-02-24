drop function if exists community_creators_rpc(int);

create function public.community_creators_rpc(
  p_min_songs int default 1
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  creator_slug text,
  creator_type text,
  arrangements int
)
language plpgsql
as $$
begin
  return query
  select
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.creator_slug,
    p.creator_type::text,
    count(s.id)::int as arrangements
  from profiles p
  join songs s on s.user_id = p.user_id
  where
    s.is_public = true
    and p.creator_type in ('creator_pro', 'creator_arrangely') -- 🔥 HANYA creator_pro
    and p.role = 'creator'
  group by
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.creator_slug,
    p.creator_type
  having count(s.id) >= p_min_songs;
end;
$$;


create function public.search_songs_rpc(
  p_search text,
  p_creator_types text[] default null,
  p_creator_ids uuid[] default null,
  p_category text default null,
  p_theme text default null,
  p_chord_grid text default null,
  p_sort text default 'recent',
  p_from int default 0,
  p_to int default 9
)
returns setof songs
language plpgsql
as $$
begin
  return query
  select s.*
  from songs s
  where s.is_public = true
    and (
      p_search is null
      or s.title ilike '%' || p_search || '%'
      or s.artist ilike '%' || p_search || '%'
      or s.created_sign ilike '%' || p_search || '%'
    )
    and (
      p_creator_types is null
      or s.user_id in (
        select p.user_id
        from profiles p
        where p.creator_type::text = any(p_creator_types)
      )
    )
    and (
      p_creator_ids is null
      or s.user_id = any(p_creator_ids)
    )
    and (
      p_category is null
      or s.category = p_category
    )
    and (
      p_theme is null
      or s.theme = p_theme
    )
    and (
      p_chord_grid is null
      or s.theme = p_chord_grid
    )
  order by
    case when p_sort = 'recent' then s.created_at end desc,
    case when p_sort = 'popular' then s.views_count end desc,
    case when p_sort = 'title' then s.title end asc
  offset p_from
  limit (p_to - p_from + 1);
end;
$$;
