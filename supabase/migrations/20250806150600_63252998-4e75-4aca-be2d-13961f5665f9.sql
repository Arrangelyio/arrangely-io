-- Add benefit_discount_code column to creator_benefit_configs
ALTER TABLE public.creator_benefit_configs 
ADD COLUMN benefit_discount_code integer NOT NULL DEFAULT 50;

-- Update the get_creator_discount_earnings function to use the percentage from config
CREATE OR REPLACE FUNCTION public.get_creator_discount_earnings(creator_id uuid)
RETURNS TABLE(total_earnings integer, total_uses integer, monthly_earnings integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH creator_config AS (
    SELECT benefit_discount_code
    FROM public.creator_benefit_configs
    WHERE creator_benefit_configs.creator_id = $1
    AND is_production = true
    LIMIT 1
  ),
  discount_benefits AS (
    SELECT 
      original_amount,
      discount_amount,
      created_at,
      CASE 
        WHEN cc.benefit_discount_code IS NOT NULL 
        THEN (discount_amount * cc.benefit_discount_code / 100)
        ELSE creator_benefit_amount 
      END as calculated_benefit
    FROM public.creator_discount_benefits cdb
    LEFT JOIN creator_config cc ON true
    WHERE cdb.creator_id = $1 
    AND cdb.is_production = true
  )
  SELECT 
    COALESCE(SUM(calculated_benefit), 0)::INTEGER as total_earnings,
    COALESCE(COUNT(*), 0)::INTEGER as total_uses,
    COALESCE(SUM(CASE 
      WHEN created_at >= date_trunc('month', CURRENT_DATE) 
      AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      THEN calculated_benefit 
      ELSE 0 
    END), 0)::INTEGER as monthly_earnings
  FROM discount_benefits;
$function$;