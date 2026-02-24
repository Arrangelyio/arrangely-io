-- Add benefit_sequencer_percentage column to creator_benefit_configs table
ALTER TABLE public.creator_benefit_configs
ADD COLUMN benefit_sequencer_percentage numeric NOT NULL DEFAULT 70;

-- Add a comment to explain the column
COMMENT ON COLUMN public.creator_benefit_configs.benefit_sequencer_percentage IS 'Percentage of sequencer sales that goes to the creator (e.g., 70 means 70% to creator, 30% to platform)';