-- Fix ambiguous column references to "status" inside score calculation
-- The error happens because song_reports and songs both have a status column, so we must qualify it.

CREATE OR REPLACE FUNCTION public.update_creator_pro_score(creator_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_score DECIMAL(5,2);
  c_score DECIMAL(5,2);
  t_score DECIMAL(5,2);
  v_weight DECIMAL(3,2);
  c_weight DECIMAL(3,2);
  warn_threshold DECIMAL(5,2);
  block_threshold DECIMAL(5,2);
  susp_threshold DECIMAL(5,2);
  current_status TEXT;
  new_status TEXT;
  pub_stats RECORD;
  rating_stats RECORD;
  report_stats RECORD;
BEGIN
  SELECT config_value INTO v_weight 
  FROM creator_pro_score_config WHERE config_key = 'validation_weight';
  SELECT config_value INTO c_weight 
  FROM creator_pro_score_config WHERE config_key = 'community_weight';
  SELECT config_value INTO warn_threshold 
  FROM creator_pro_score_config WHERE config_key = 'warning_threshold';
  SELECT config_value INTO block_threshold 
  FROM creator_pro_score_config WHERE config_key = 'block_threshold';
  SELECT config_value INTO susp_threshold 
  FROM creator_pro_score_config WHERE config_key = 'suspension_threshold';
  
  v_score := calculate_validation_score(creator_id);
  c_score := calculate_community_score(creator_id);
  t_score := (v_score * COALESCE(v_weight, 0.6)) + (c_score * COALESCE(c_weight, 0.4));
  
  SELECT cps.status INTO current_status FROM creator_pro_scores cps WHERE cps.user_id = creator_id;
  
  IF t_score <= COALESCE(susp_threshold, 20) THEN
    new_status := 'suspended';
  ELSIF t_score <= COALESCE(block_threshold, 30) THEN
    new_status := 'blocked';
  ELSIF t_score <= COALESCE(warn_threshold, 50) THEN
    new_status := 'warning';
  ELSE
    new_status := 'active';
  END IF;
  
  -- Get publication stats
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE cpp.status IN ('approved', 'active')) as approved,
    COUNT(*) FILTER (WHERE cpp.status = 'rejected') as rejected
  INTO pub_stats
  FROM creator_pro_publications cpp
  WHERE cpp.user_id = creator_id AND cpp.is_production = true;
  
  -- Get rating stats
  SELECT 
    COUNT(*) as total,
    COALESCE(AVG(sr.rating), 0) as avg
  INTO rating_stats
  FROM song_ratings sr
  JOIN songs s ON s.id = sr.song_id
  WHERE s.user_id = creator_id;
  
  -- Get report stats
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE rep.status = 'confirmed') as confirmed
  INTO report_stats
  FROM song_reports rep
  JOIN songs s ON s.id = rep.song_id
  WHERE s.user_id = creator_id;
  
  INSERT INTO creator_pro_scores (
    user_id, validation_score, community_score, total_score, status,
    total_publications, approved_publications, rejected_publications,
    total_ratings, average_rating, total_reports, confirmed_reports
  ) VALUES (
    creator_id, v_score, c_score, t_score, new_status,
    pub_stats.total, pub_stats.approved, pub_stats.rejected,
    rating_stats.total, rating_stats.avg, report_stats.total, report_stats.confirmed
  )
  ON CONFLICT (user_id) DO UPDATE SET
    validation_score = v_score,
    community_score = c_score,
    total_score = t_score,
    status = new_status,
    total_publications = pub_stats.total,
    approved_publications = pub_stats.approved,
    rejected_publications = pub_stats.rejected,
    total_ratings = rating_stats.total,
    average_rating = rating_stats.avg,
    total_reports = report_stats.total,
    confirmed_reports = report_stats.confirmed,
    updated_at = now();
END;
$function$;
