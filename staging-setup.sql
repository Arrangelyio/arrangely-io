-- Comprehensive Staging Setup Script
-- This script recreates the entire database structure from production

-- First, create all custom types
CREATE TYPE public.musical_role_type AS ENUM (
  'keyboardist',
  'guitarist', 
  'bassist',
  'drummer',
  'vocalist',
  'worship_leader',
  'music_director',
  'sound_engineer',
  'other'
);

CREATE TYPE public.usage_context_type AS ENUM (
  'church',
  'event',
  'cafe',
  'concert',
  'studio',
  'personal',
  'education',
  'other'
);

CREATE TYPE public.experience_level_type AS ENUM (
  'beginner',
  'intermediate', 
  'advanced',
  'professional'
);

CREATE TYPE public.user_role AS ENUM ('admin', 'creator', 'user');

CREATE TYPE public.song_key AS ENUM (
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'
);

CREATE TYPE public.time_signature AS ENUM ('4/4', '3/4', '2/4', '6/8');

-- Create the update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  musical_role TEXT,
  usage_context TEXT,
  experience_level TEXT,
  instruments TEXT[],
  is_onboarded BOOLEAN NOT NULL DEFAULT false,
  role public.user_role DEFAULT 'user',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create songs table
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  original_key public.song_key NOT NULL DEFAULT 'C',
  current_key public.song_key NOT NULL DEFAULT 'C',
  tempo INTEGER DEFAULT 120,
  time_signature public.time_signature NOT NULL DEFAULT '4/4',
  capo INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  is_public BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  is_favorite BOOLEAN DEFAULT false,
  folder_id UUID,
  rating INTEGER,
  youtube_link TEXT,
  youtube_thumbnail TEXT,
  difficulty TEXT DEFAULT 'Beginner',
  theme TEXT DEFAULT 'worship',
  sequencer_price INTEGER DEFAULT 0,
  sequencer_drive_link TEXT,
  original_creator_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song sections table
CREATE TABLE public.song_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL,
  name TEXT,
  section_type TEXT NOT NULL,
  section_type_original TEXT,
  lyrics TEXT,
  chords TEXT,
  bar_count INTEGER DEFAULT 4,
  section_time_signature public.time_signature,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create arrangements table
CREATE TABLE public.arrangements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL,
  section_id UUID NOT NULL,
  position INTEGER NOT NULL,
  repeat_count INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song collaborators table
CREATE TABLE public.song_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID NOT NULL,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view',
  invited_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create setlists table
CREATE TABLE public.setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  theme TEXT,
  song_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song folders table
CREATE TABLE public.song_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song activity table
CREATE TABLE public.song_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create song likes table
CREATE TABLE public.song_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Create user follows table
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  currency TEXT DEFAULT 'IDR',
  interval_type TEXT NOT NULL DEFAULT 'month',
  interval_count INTEGER DEFAULT 1,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID,
  midtrans_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  is_trial BOOLEAN DEFAULT false,
  trial_expired BOOLEAN DEFAULT false,
  auto_payment_enabled BOOLEAN DEFAULT true,
  payment_failed_count INTEGER DEFAULT 0,
  next_payment_attempt TIMESTAMP WITH TIME ZONE,
  last_payment_status TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID,
  midtrans_order_id TEXT,
  midtrans_transaction_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  sequencer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount codes table
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value INTEGER NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription cancellations table
CREATE TABLE public.subscription_cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT,
  reason_category TEXT,
  feedback TEXT,
  canceled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  offered_discount BOOLEAN DEFAULT false,
  accepted_discount BOOLEAN DEFAULT false
);

-- Create creator applications table
CREATE TABLE public.creator_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  musical_background TEXT NOT NULL,
  experience_years INTEGER,
  instruments TEXT[],
  specialties TEXT[],
  sample_work_url TEXT,
  motivation TEXT NOT NULL,
  social_links JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PDF export usage table
CREATE TABLE public.pdf_export_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID,
  export_type TEXT NOT NULL DEFAULT 'song',
  exported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube import usage table
CREATE TABLE public.youtube_import_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  youtube_url TEXT NOT NULL,
  import_type TEXT NOT NULL DEFAULT 'enhanced_analysis',
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create error logs table
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  operation_type TEXT NOT NULL,
  table_name TEXT,
  stack_trace TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_export_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_import_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.user_can_access_song(_song_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.song_collaborators 
    WHERE song_id = _song_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_song(_song_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.song_collaborators 
    WHERE song_id = _song_id 
    AND user_id = _user_id 
    AND permission IN ('edit', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_live_preview_context()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'user'::user_role)
  FROM public.profiles 
  WHERE user_id = $1
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_has_permission(user_id uuid, permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN get_user_role(user_id) = 'admin' THEN true
      ELSE (
        SELECT COALESCE((permissions ->> permission)::boolean, false)
        FROM public.profiles 
        WHERE user_id = $1
      )
    END;
$$;

CREATE OR REPLACE FUNCTION public.increment_song_views(song_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.songs 
  SET views_count = COALESCE(views_count, 0) + 1,
      last_viewed_at = now()
  WHERE id = song_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_song_like_count(song_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.song_likes
  WHERE song_likes.song_id = $1;
$$;

CREATE OR REPLACE FUNCTION public.user_likes_song(song_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.song_likes
    WHERE song_likes.song_id = $1 AND song_likes.user_id = $2
  );
$$;

CREATE OR REPLACE FUNCTION public.user_follows_creator(creator_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.user_follows
    WHERE following_id = $1 AND follower_id = $2
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_monthly_export_count(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.pdf_export_usage
  WHERE user_id = $1
    AND exported_at >= date_trunc('month', CURRENT_DATE)
    AND exported_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
$$;

CREATE OR REPLACE FUNCTION public.get_user_monthly_youtube_import_count(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.youtube_import_usage
  WHERE user_id = $1
    AND imported_at >= date_trunc('month', CURRENT_DATE)
    AND imported_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name,
    musical_role,
    usage_context,
    experience_level,
    instruments
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'musical_role',
    NEW.raw_user_meta_data ->> 'usage_context',
    NEW.raw_user_meta_data ->> 'experience_level',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'instruments' IS NOT NULL 
      THEN string_to_array(replace(replace(NEW.raw_user_meta_data ->> 'instruments', '[', ''), ']', ''), ',')
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create all triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
BEFORE UPDATE ON public.songs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_song_sections_updated_at
BEFORE UPDATE ON public.song_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setlists_updated_at
BEFORE UPDATE ON public.setlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_song_folders_updated_at
BEFORE UPDATE ON public.song_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_updated_at();

CREATE TRIGGER update_creator_applications_updated_at
BEFORE UPDATE ON public.creator_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add all indexes for performance
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_operation_type ON public.error_logs(operation_type);
CREATE INDEX idx_creator_applications_user_id ON public.creator_applications(user_id);
CREATE INDEX idx_creator_applications_status ON public.creator_applications(status);
CREATE INDEX idx_creator_applications_created_at ON public.creator_applications(created_at DESC);
CREATE INDEX idx_payments_sequencer_id ON public.payments(sequencer_id);
CREATE INDEX idx_payments_user_sequencer ON public.payments(user_id, sequencer_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (id, name, price, currency, interval_type, interval_count, is_active, features) VALUES 
(gen_random_uuid(), 'Monthly Premium', 30000, 'IDR', 'month', 1, true, '{
  "ai_tools": true,
  "arrangements": "unlimited",
  "collaboration": true,
  "pdf_exports": "unlimited",
  "priority_support": true
}'::jsonb),
(gen_random_uuid(), 'Yearly Premium', 250000, 'IDR', 'year', 1, true, '{
  "ai_tools": true,
  "arrangements": "unlimited",
  "collaboration": true,
  "pdf_exports": "unlimited",
  "priority_support": true,
  "yearly_discount": true
}'::jsonb);

-- Insert sample discount codes
INSERT INTO public.discount_codes (code, discount_type, discount_value, max_uses, valid_until, is_active) VALUES 
('MAESTRO100', 'percentage', 100, 10, '2025-12-31 23:59:59+00', true),
('HARMONY75', 'percentage', 75, 25, '2025-12-31 23:59:59+00', true),
('MELODY50', 'percentage', 50, 50, '2025-12-31 23:59:59+00', true),
('RHYTHM25', 'percentage', 25, 100, '2025-12-31 23:59:59+00', true);

-- Create all RLS policies (continuing in next comment due to length...)