-- Add biller_code and bill_key columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS biller_code TEXT,
ADD COLUMN IF NOT EXISTS bill_key TEXT;

COMMENT ON COLUMN public.payments.biller_code IS 'Mandiri company code from Midtrans echannel response';
COMMENT ON COLUMN public.payments.bill_key IS 'Mandiri bill key / virtual account number from Midtrans echannel response';

CREATE OR REPLACE FUNCTION get_weekly_trending_songs(
  limit_count INT DEFAULT 20,
  days_back INT DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  artist TEXT,
  current_key TEXT,
  tempo INT,
  views_count BIGINT,
  tags TEXT[],
  youtube_link TEXT,
  slug TEXT,
  youtube_thumbnail TEXT,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  creator_type TEXT,
  created_at TIMESTAMPTZ
)
AS $$
BEGIN
  RETURN QUERY
  WITH recent_songs AS (
    SELECT
      s.id,
      s.title,
      s.artist,
      s.current_key::TEXT AS current_key,
      s.tempo,
      s.views_count::BIGINT AS views_count,
      s.tags,
      s.youtube_link,
      s.slug,
      s.youtube_thumbnail,
      s.user_id,
      p.display_name,
      p.avatar_url,
      p.creator_type::TEXT AS creator_type, -- ✅ cast ENUM ke TEXT
      s.created_at
    FROM songs s
    LEFT JOIN profiles p ON s.user_id = p.user_id
    WHERE s.is_public = TRUE
      AND s.created_at >= (NOW() - (days_back || ' days')::INTERVAL)
    ORDER BY s.views_count DESC
    LIMIT limit_count
  ),
  fallback_songs AS (
    SELECT
      s.id,
      s.title,
      s.artist,
      s.current_key::TEXT AS current_key,
      s.tempo,
      s.views_count::BIGINT AS views_count,
      s.tags,
      s.youtube_link,
      s.slug,
      s.youtube_thumbnail,
      s.user_id,
      p.display_name,
      p.avatar_url,
      p.creator_type::TEXT AS creator_type, -- ✅ cast ENUM ke TEXT juga di fallback
      s.created_at
    FROM songs s
    LEFT JOIN profiles p ON s.user_id = p.user_id
    WHERE s.is_public = TRUE
    ORDER BY s.created_at DESC
    LIMIT limit_count
  )
  SELECT * FROM recent_songs
  UNION ALL
  SELECT * FROM fallback_songs
  WHERE NOT EXISTS (SELECT 1 FROM recent_songs);
END;
$$ LANGUAGE plpgsql STABLE;
