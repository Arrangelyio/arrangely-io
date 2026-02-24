-- Insert default rejection weight configurations
INSERT INTO public.rejection_weight_config (rejection_reason, weight_penalty, description) VALUES
('content_violation', 25.00, 'SARA, pornographic, hate speech, or inappropriate content'),
('invalid_youtube', 15.00, 'YouTube link is invalid, removed, or not music category'),
('incomplete_sections', 10.00, 'Song has less than required sections'),
('invalid_chords', 10.00, 'Chords are incorrectly formatted or missing'),
('duplicate_content', 15.00, 'Song already exists in marketplace'),
('low_quality', 8.00, 'General low quality arrangement'),
('other', 5.00, 'Other minor issues')
ON CONFLICT (rejection_reason) DO NOTHING;

-- Insert default score configuration
INSERT INTO public.creator_pro_score_config (config_key, config_value, description) VALUES
('validation_weight', 0.60, 'Weight of validation score in total score'),
('community_weight', 0.40, 'Weight of community score in total score'),
('report_penalty', 5.00, 'Points deducted per confirmed report'),
('warning_threshold', 50.00, 'Score threshold to trigger warning'),
('block_threshold', 30.00, 'Score threshold to block publishing'),
('suspension_threshold', 20.00, 'Score threshold for account suspension'),
('block_duration_days', 14, 'Days publishing is blocked'),
('min_ratings_for_score', 5, 'Minimum ratings before community score affects total'),
('benefit_per_song_publish', 5000, 'Benefit amount per published song (IDR)'),
('benefit_per_library_add', 250, 'Benefit amount per library add (IDR)')
ON CONFLICT (config_key) DO NOTHING;

-- Create function to calculate validation score
CREATE OR REPLACE FUNCTION public.calculate_validation_score(creator_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_score DECIMAL(5,2) := 100.00;
  total_penalty DECIMAL(5,2) := 0.00;
  rejection_record RECORD;
BEGIN
  FOR rejection_record IN
    SELECT 
      cpp.validation_results->>'rejection_reason' as reason,
      COALESCE(rwc.weight_penalty, 5.00) as penalty
    FROM creator_pro_publications cpp
    LEFT JOIN rejection_weight_config rwc 
      ON rwc.rejection_reason = cpp.validation_results->>'rejection_reason'
    WHERE cpp.user_id = creator_id
      AND cpp.status = 'rejected'
      AND cpp.is_production = true
  LOOP
    total_penalty := total_penalty + rejection_record.penalty;
  END LOOP;
  
  RETURN GREATEST(0, base_score - total_penalty);
END;
$$;

-- Create function to calculate community score
CREATE OR REPLACE FUNCTION public.calculate_community_score(creator_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  rating_count INTEGER;
  confirmed_reports INTEGER;
  report_penalty DECIMAL(5,2);
  min_ratings INTEGER;
  base_score DECIMAL(5,2);
BEGIN
  SELECT config_value INTO report_penalty 
  FROM creator_pro_score_config WHERE config_key = 'report_penalty';
  
  SELECT config_value INTO min_ratings 
  FROM creator_pro_score_config WHERE config_key = 'min_ratings_for_score';
  
  SELECT 
    AVG(sr.rating),
    COUNT(*)
  INTO avg_rating, rating_count
  FROM song_ratings sr
  JOIN songs s ON s.id = sr.song_id
  WHERE s.user_id = creator_id;
  
  SELECT COUNT(*) INTO confirmed_reports
  FROM song_reports rep
  JOIN songs s ON s.id = rep.song_id
  WHERE s.user_id = creator_id
    AND rep.status = 'confirmed';
  
  IF rating_count < COALESCE(min_ratings, 5) THEN
    base_score := 80.00;
  ELSE
    base_score := (COALESCE(avg_rating, 5) / 5.0) * 100;
  END IF;
  
  RETURN GREATEST(0, base_score - (confirmed_reports * COALESCE(report_penalty, 5)));
END;
$$;

-- Create function to update total score
CREATE OR REPLACE FUNCTION public.update_creator_pro_score(creator_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  SELECT status INTO current_status FROM creator_pro_scores WHERE user_id = creator_id;
  
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
    COUNT(*) FILTER (WHERE status IN ('approved', 'active')) as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
  INTO pub_stats
  FROM creator_pro_publications 
  WHERE user_id = creator_id AND is_production = true;
  
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
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed
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
$$;

-- Create trigger function for publication score update
CREATE OR REPLACE FUNCTION public.trigger_publication_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected', 'active') THEN
    PERFORM update_creator_pro_score(NEW.user_id);
    
    INSERT INTO creator_score_history (
      user_id, event_type, event_details
    ) VALUES (
      NEW.user_id,
      CASE WHEN NEW.status = 'rejected' THEN 'publication_rejected' ELSE 'publication_approved' END,
      jsonb_build_object('publication_id', NEW.id, 'song_id', NEW.song_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for publication status changes
DROP TRIGGER IF EXISTS update_score_on_publication ON public.creator_pro_publications;
CREATE TRIGGER update_score_on_publication
AFTER UPDATE OF status ON public.creator_pro_publications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_publication_score_update();

-- Create trigger function for rating score update
CREATE OR REPLACE FUNCTION public.trigger_rating_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  song_owner_id UUID;
BEGIN
  SELECT user_id INTO song_owner_id FROM songs WHERE id = NEW.song_id;
  
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = song_owner_id AND creator_type = 'creator_pro'
  ) THEN
    PERFORM update_creator_pro_score(song_owner_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ratings
DROP TRIGGER IF EXISTS update_score_on_rating ON public.song_ratings;
CREATE TRIGGER update_score_on_rating
AFTER INSERT OR UPDATE ON public.song_ratings
FOR EACH ROW
EXECUTE FUNCTION public.trigger_rating_score_update();

-- Create trigger function for report score update
CREATE OR REPLACE FUNCTION public.trigger_report_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  song_owner_id UUID;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    SELECT user_id INTO song_owner_id FROM songs WHERE id = NEW.song_id;
    
    IF EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = song_owner_id AND creator_type = 'creator_pro'
    ) THEN
      PERFORM update_creator_pro_score(song_owner_id);
      
      INSERT INTO creator_score_history (
        user_id, event_type, event_details
      ) VALUES (
        song_owner_id,
        'report_confirmed',
        jsonb_build_object('report_id', NEW.id, 'song_id', NEW.song_id, 'reason', NEW.report_reason)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for reports
DROP TRIGGER IF EXISTS update_score_on_report ON public.song_reports;
CREATE TRIGGER update_score_on_report
AFTER UPDATE OF status ON public.song_reports
FOR EACH ROW
EXECUTE FUNCTION public.trigger_report_score_update();