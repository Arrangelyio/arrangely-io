-- Create discount_code_assignments table to map discount codes to creators
CREATE TABLE public.discount_code_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(discount_code_id, creator_id)
);

-- Enable RLS
ALTER TABLE public.discount_code_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for discount_code_assignments
CREATE POLICY "Admins can manage discount code assignments" 
ON public.discount_code_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

CREATE POLICY "Creators can view their assigned codes" 
ON public.discount_code_assignments 
FOR SELECT 
USING (creator_id = auth.uid());

-- Add creator_discount_benefits table to track benefits from discount code usage
CREATE TABLE public.creator_discount_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  original_amount INTEGER NOT NULL, -- Original subscription amount before discount
  discount_amount INTEGER NOT NULL, -- Amount discounted
  creator_benefit_amount INTEGER NOT NULL, -- Amount creator receives (50% of discount)
  admin_benefit_amount INTEGER NOT NULL, -- Amount admin receives (50% of discount)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.creator_discount_benefits ENABLE ROW LEVEL SECURITY;

-- Policies for creator_discount_benefits
CREATE POLICY "Admins can manage all discount benefits" 
ON public.creator_discount_benefits 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

CREATE POLICY "Creators can view their discount benefits" 
ON public.creator_discount_benefits 
FOR SELECT 
USING (creator_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_discount_code_assignments_updated_at
  BEFORE UPDATE ON public.discount_code_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get creator discount earnings
CREATE OR REPLACE FUNCTION public.get_creator_discount_earnings(creator_id uuid)
RETURNS TABLE(
  total_earnings integer,
  total_uses integer,
  monthly_earnings integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 
    COALESCE(SUM(creator_benefit_amount), 0)::INTEGER as total_earnings,
    COALESCE(COUNT(*), 0)::INTEGER as total_uses,
    COALESCE(SUM(CASE 
      WHEN created_at >= date_trunc('month', CURRENT_DATE) 
      AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      THEN creator_benefit_amount 
      ELSE 0 
    END), 0)::INTEGER as monthly_earnings
  FROM public.creator_discount_benefits 
  WHERE creator_discount_benefits.creator_id = $1 
  AND is_production = true;
$function$;