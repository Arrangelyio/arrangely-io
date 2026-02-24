-- Add original_price column to subscription_plans for strikethrough pricing
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS original_price integer;

-- Set original_price same as price for existing plans (no strikethrough by default)
UPDATE public.subscription_plans 
SET original_price = price 
WHERE original_price IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.subscription_plans.original_price IS 'Original price before discount. If equal to price, no strikethrough is shown. Used for display only - actual payment uses price column.';