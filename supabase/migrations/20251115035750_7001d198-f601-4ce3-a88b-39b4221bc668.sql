-- Add created_by column to songs table and populate with current user_id
ALTER TABLE songs ADD COLUMN IF NOT EXISTS created_by uuid;

-- Populate created_by with current user_id for existing records
UPDATE songs SET created_by = user_id WHERE created_by IS NULL;

-- Add unique constraint on creator_benefits for (creator_id, benefit_type)
ALTER TABLE creator_benefits 
DROP CONSTRAINT IF EXISTS unique_creator_benefit_type;

ALTER TABLE creator_benefits 
ADD CONSTRAINT unique_creator_benefit_type 
UNIQUE (creator_id, benefit_type, song_id);