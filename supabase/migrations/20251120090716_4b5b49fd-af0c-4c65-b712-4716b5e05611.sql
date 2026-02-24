-- Add lesson benefit percentage to creator_benefit_configs
ALTER TABLE creator_benefit_configs
ADD COLUMN benefit_lesson_percentage integer NOT NULL DEFAULT 70;

COMMENT ON COLUMN creator_benefit_configs.benefit_lesson_percentage IS 'Percentage of lesson revenue that goes to the creator (e.g., 70 means creator gets 70%, platform gets 30%)';