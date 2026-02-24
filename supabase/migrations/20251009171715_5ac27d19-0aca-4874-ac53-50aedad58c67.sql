-- Add camera recording feature to lessons

-- Add field to lesson_content to enable camera recording
ALTER TABLE lesson_content
ADD COLUMN enable_camera_recording boolean DEFAULT false;

-- Create table for student performance recordings
CREATE TABLE IF NOT EXISTS lesson_performance_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES lesson_content(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  duration_seconds integer,
  submitted_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'graded')),
  creator_notes text,
  score integer CHECK (score >= 0 AND score <= 100),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id),
  is_production boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE lesson_performance_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_performance_recordings

-- Users can view their own recordings
CREATE POLICY "Users can view their own recordings"
ON lesson_performance_recordings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own recordings
CREATE POLICY "Users can create their own recordings"
ON lesson_performance_recordings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Creators can view recordings for their lessons
CREATE POLICY "Creators can view recordings for their lessons"
ON lesson_performance_recordings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    WHERE l.id = lesson_performance_recordings.lesson_id
    AND l.creator_id = auth.uid()
  )
);

-- Creators can update recordings for their lessons (scoring/review)
CREATE POLICY "Creators can update recordings for their lessons"
ON lesson_performance_recordings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    WHERE l.id = lesson_performance_recordings.lesson_id
    AND l.creator_id = auth.uid()
  )
);

-- Admins can manage all recordings
CREATE POLICY "Admins can manage all recordings"
ON lesson_performance_recordings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create storage bucket for performance recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-recordings', 'lesson-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson recordings

-- Users can upload their own recordings
CREATE POLICY "Users can upload their own recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own recordings
CREATE POLICY "Users can view their own recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lesson-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Creators can view recordings for their lessons
CREATE POLICY "Creators can view lesson recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lesson-recordings'
  AND EXISTS (
    SELECT 1 FROM lesson_performance_recordings lpr
    JOIN lessons l ON l.id = lpr.lesson_id
    WHERE lpr.video_url LIKE '%' || name || '%'
    AND l.creator_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_lesson_performance_recordings_user_id 
ON lesson_performance_recordings(user_id);

CREATE INDEX idx_lesson_performance_recordings_lesson_id 
ON lesson_performance_recordings(lesson_id);

CREATE INDEX idx_lesson_performance_recordings_status 
ON lesson_performance_recordings(status);