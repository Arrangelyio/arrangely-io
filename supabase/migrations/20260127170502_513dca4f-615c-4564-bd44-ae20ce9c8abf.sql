-- Add 'creator_pro' to the creator_type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'creator_pro' AND enumtypid = 'public.creator_type'::regtype) THEN
    ALTER TYPE public.creator_type ADD VALUE 'creator_pro';
  END IF;
END $$;

-- Create Creator Pro Publications table
CREATE TABLE IF NOT EXISTS public.creator_pro_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  published_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending_review' CHECK (status IN (
    'pending_review', 'approved', 'rejected', 'active', 'archived'
  )),
  validation_results JSONB DEFAULT '{}',
  review_notes TEXT,
  rejected_reason TEXT,
  is_production BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(song_id)
);

-- Create Content Validation Queue table
CREATE TABLE IF NOT EXISTS public.content_validation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID REFERENCES public.creator_pro_publications(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('youtube', 'sections', 'chords', 'content')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed')),
  result JSONB DEFAULT '{}',
  error_message TEXT,
  is_production BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create Song Ratings table
CREATE TABLE IF NOT EXISTS public.song_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  is_production BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(song_id, user_id)
);

-- Create Song Reports table
CREATE TABLE IF NOT EXISTS public.song_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_reason TEXT NOT NULL CHECK (report_reason IN (
    'inappropriate_content', 'wrong_chords', 'spam', 
    'copyright', 'misleading', 'other'
  )),
  report_details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'confirmed', 'dismissed'
  )),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  is_production BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(song_id, reporter_id)
);

-- Create Creator Pro Scores table
CREATE TABLE IF NOT EXISTS public.creator_pro_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  validation_score DECIMAL(5,2) DEFAULT 100.00,
  community_score DECIMAL(5,2) DEFAULT 100.00,
  total_score DECIMAL(5,2) DEFAULT 100.00,
  total_publications INTEGER DEFAULT 0,
  approved_publications INTEGER DEFAULT 0,
  rejected_publications INTEGER DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reports INTEGER DEFAULT 0,
  confirmed_reports INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'warning', 'blocked', 'suspended'
  )),
  blocked_until TIMESTAMPTZ,
  suspension_reason TEXT,
  last_warning_at TIMESTAMPTZ,
  warning_count INTEGER DEFAULT 0,
  is_production BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Creator Score History table
CREATE TABLE IF NOT EXISTS public.creator_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'publication_approved', 'publication_rejected',
    'rating_received', 'report_confirmed', 'report_dismissed',
    'warning_issued', 'block_applied', 'suspension_applied',
    'score_restored', 'manual_adjustment'
  )),
  score_before DECIMAL(5,2),
  score_after DECIMAL(5,2),
  score_delta DECIMAL(5,2),
  event_details JSONB DEFAULT '{}',
  is_production BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Rejection Weight Configuration table
CREATE TABLE IF NOT EXISTS public.rejection_weight_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rejection_reason TEXT NOT NULL UNIQUE,
  weight_penalty DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_production BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Creator Pro Score Configuration table
CREATE TABLE IF NOT EXISTS public.creator_pro_score_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value DECIMAL(10,2) NOT NULL,
  description TEXT,
  is_production BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add grace period columns to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grace_period_started_at TIMESTAMPTZ;

-- Enable RLS on all new tables
ALTER TABLE public.creator_pro_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_validation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_pro_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_weight_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_pro_score_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_pro_publications
CREATE POLICY "Users can view their own publications" ON public.creator_pro_publications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own publications" ON public.creator_pro_publications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own publications" ON public.creator_pro_publications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public can view active publications" ON public.creator_pro_publications
  FOR SELECT USING (status = 'active');

-- RLS Policies for content_validation_queue
CREATE POLICY "Users can view their own validation queue" ON public.content_validation_queue
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.creator_pro_publications cpp WHERE cpp.id = publication_id AND cpp.user_id = auth.uid())
  );

-- RLS Policies for song_ratings
CREATE POLICY "Anyone can view ratings" ON public.song_ratings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can rate songs" ON public.song_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON public.song_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" ON public.song_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for song_reports
CREATE POLICY "Users can view their own reports" ON public.song_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Authenticated users can submit reports" ON public.song_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- RLS Policies for creator_pro_scores
CREATE POLICY "Anyone can view scores" ON public.creator_pro_scores
  FOR SELECT USING (true);

CREATE POLICY "System can manage scores" ON public.creator_pro_scores
  FOR ALL USING (true);

-- RLS Policies for creator_score_history
CREATE POLICY "Users can view their own score history" ON public.creator_score_history
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for rejection_weight_config (admin only via service role)
CREATE POLICY "Anyone can view rejection weights" ON public.rejection_weight_config
  FOR SELECT USING (true);

-- RLS Policies for creator_pro_score_config (admin only via service role)
CREATE POLICY "Anyone can view score config" ON public.creator_pro_score_config
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_pro_publications_user_id ON public.creator_pro_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_pro_publications_status ON public.creator_pro_publications(status);
CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON public.song_ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_song_reports_status ON public.song_reports(status);
CREATE INDEX IF NOT EXISTS idx_creator_pro_scores_total_score ON public.creator_pro_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_creator_pro_scores_status ON public.creator_pro_scores(status);