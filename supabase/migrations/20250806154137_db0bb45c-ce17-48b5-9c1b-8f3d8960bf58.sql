-- Add discount_code_id column to payments table
ALTER TABLE public.payments 
ADD COLUMN discount_code_id UUID REFERENCES public.discount_codes(id);

-- Update the get_creator_discount_earnings function to calculate from payments table
CREATE OR REPLACE FUNCTION public.get_creator_discount_earnings(creator_id uuid)
RETURNS TABLE(total_earnings integer, total_uses integer, monthly_earnings integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH creator_benefits AS (
  SELECT 
    cdb.creator_benefit_amount,
    cdb.created_at
  FROM public.creator_discount_benefits cdb
  WHERE cdb.creator_id = $1
    AND cdb.is_production = true
)
SELECT 
  COALESCE(SUM(creator_benefit_amount), 0)::INTEGER as total_earnings,
  COALESCE(COUNT(*), 0)::INTEGER as total_uses,
  COALESCE(SUM(CASE 
    WHEN created_at >= date_trunc('month', CURRENT_DATE) 
     AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    THEN creator_benefit_amount 
    ELSE 0 
  END), 0)::INTEGER as monthly_earnings
FROM creator_benefits;
$function$;