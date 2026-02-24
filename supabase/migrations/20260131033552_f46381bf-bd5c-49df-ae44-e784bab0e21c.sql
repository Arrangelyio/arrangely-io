-- Create a function to get publication with song details for admin review
CREATE OR REPLACE FUNCTION public.get_publication_for_review(publication_id UUID)
RETURNS TABLE (
  id UUID,
  song_id UUID,
  user_id UUID,
  status TEXT,
  validation_results JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  rejected_reason TEXT,
  review_notes TEXT,
  is_production BOOLEAN,
  song_title TEXT,
  song_artist TEXT,
  song_youtube_link TEXT,
  song_user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.song_id,
    p.user_id,
    p.status,
    p.validation_results,
    p.created_at,
    p.updated_at,
    p.published_at,
    p.rejected_reason,
    p.review_notes,
    p.is_production,
    s.title AS song_title,
    s.artist AS song_artist,
    s.youtube_link AS song_youtube_link,
    s.user_id AS song_user_id
  FROM creator_pro_publications p
  LEFT JOIN songs s ON s.id = p.song_id
  WHERE p.id = publication_id;
END;
$$;