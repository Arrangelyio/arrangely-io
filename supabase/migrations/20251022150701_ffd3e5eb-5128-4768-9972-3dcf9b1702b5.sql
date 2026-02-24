-- Enable RLS on tier_assessment_questions table
ALTER TABLE tier_assessment_questions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active production questions (public access for assessment)
CREATE POLICY "Anyone can view active production tier questions"
ON tier_assessment_questions
FOR SELECT
USING (is_production = true);

-- Only admins can manage tier assessment questions
CREATE POLICY "Only admins can manage tier assessment questions"
ON tier_assessment_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);