-- Add is_unlisted column to lessons table
ALTER TABLE lessons 
ADD COLUMN is_unlisted boolean NOT NULL DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_lessons_unlisted ON lessons(is_unlisted) WHERE is_unlisted = false;

-- Update RLS policies to allow direct access to unlisted lessons
-- (they should still be accessible via direct URL even if unlisted)