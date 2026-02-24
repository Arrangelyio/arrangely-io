-- Fungsi ini akan mengambil lagu publik dengan data profil kreator yang sudah digabungkan
CREATE OR REPLACE FUNCTION get_public_songs(
    p_search_term TEXT,
    p_sort_by TEXT,
    p_category TEXT,
    p_creator_filter TEXT,
    p_followed_ids UUID[],
    p_show_followed_only BOOLEAN,
    p_page_num INT,
    p_page_size INT,
    p_current_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    query_sql TEXT;
    songs_result JSON;
    total_count BIGINT;
BEGIN
    -- Query dasar yang menggabungkan tabel 'songs' dan 'profiles'
    query_sql := '
        FROM
            songs s
        LEFT JOIN
            profiles p ON s.user_id = p.user_id
        WHERE
            s.is_public = true';

    -- Filter pencarian
    IF p_search_term IS NOT NULL AND p_search_term != '' THEN
        query_sql := query_sql || '
            AND (
                s.title ILIKE ''%'' || p_search_term || ''%'' OR
                s.artist ILIKE ''%'' || p_search_term || ''%'' OR
                s.created_sign ILIKE ''%'' || p_search_term || ''%''
            )';
    END IF;

    -- Filter kategori
    IF p_category IS NOT NULL AND p_category != 'all' THEN
        query_sql := query_sql || ' AND s.category = ' || quote_literal(p_category);
    END IF;

    -- Filter kreator "Arrangely Creator"
    IF p_creator_filter = 'Arrangely Creator' THEN
       query_sql := query_sql || ' AND p.creator_type = ''creator_arrangely''';
    END IF;

    -- Filter "Hanya yang Diikuti"
    IF p_show_followed_only AND array_length(p_followed_ids, 1) > 0 THEN
        query_sql := query_sql || ' AND s.user_id = ANY(' || quote_literal(p_followed_ids::text) || '::uuid[])';
    END IF;

    -- Hitung total data sebelum paginasi
    EXECUTE 'SELECT count(*) ' || query_sql
    INTO total_count;

    -- Bangun query SELECT utama dengan semua transformasi data
    query_sql := '
        SELECT
            json_agg(t)
        FROM (
            SELECT
                s.id,
                s.title,
                s.artist,
                s.current_key AS key,
                s.tempo,
                s.tags,
                s.difficulty,
                s.views_count AS views,
                s.likes_count AS likes,
                s.is_public AS "isPublic",
                s.created_at AS "createdAt",
                s.youtube_link AS "youtubeLink",
                s.youtube_thumbnail AS "youtubeThumbnail",
                s.user_id,
                -- Nama dan avatar arranger dinamis
                CASE
                    WHEN p.creator_type = ''creator_arrangely'' THEN ''Arrangely Creator''
                    ELSE COALESCE(s.created_sign, p.display_name, ''Unknown Creator'')
                END AS arranger,
                CASE
                    WHEN p.creator_type = ''creator_arrangely'' THEN NULL
                    ELSE p.avatar_url
                END AS "arrangerAvatar",
                -- Cek apakah user saat ini sudah menyukai lagu ini
                EXISTS (
                    SELECT 1 FROM song_likes sl
                    WHERE sl.song_id = s.id AND sl.user_id = p_current_user_id
                ) AS "isLiked",
                -- Cek apakah kreator diikuti oleh user saat ini
                EXISTS (
                    SELECT 1 FROM user_follows uf
                    WHERE uf.following_id = s.user_id AND uf.follower_id = p_current_user_id
                ) AS "isFollowed",
                p.role = ''creator'' OR p.role = ''admin'' as "isTrusted"
            ' || query_sql;

    -- Pengurutan
    CASE p_sort_by
        WHEN 'popular' THEN query_sql := query_sql || ' ORDER BY s.views_count DESC';
        WHEN 'liked' THEN query_sql := query_sql || ' ORDER BY s.likes_count DESC NULLS LAST';
        WHEN 'title' THEN query_sql := query_sql || ' ORDER BY s.title ASC';
        ELSE query_sql := query_sql || ' ORDER BY s.created_at DESC';
    END CASE;

    -- Paginasi
    query_sql := query_sql || '
        LIMIT ' || p_page_size || '
        OFFSET ' || (p_page_num - 1) * p_page_size;

    query_sql := query_sql || ') t';

    -- Eksekusi query final untuk mendapatkan daftar lagu
    EXECUTE query_sql
    INTO songs_result;

    -- Kembalikan objek JSON final
    RETURN json_build_object(
        'songs', COALESCE(songs_result, '[]'::json),
        'totalCount', total_count
    );
END;
$$;