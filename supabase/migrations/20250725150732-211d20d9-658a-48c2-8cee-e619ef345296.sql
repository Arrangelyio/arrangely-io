-- Create a function that returns payment data with user emails for admin users
CREATE OR REPLACE FUNCTION public.get_admin_payments_data()
RETURNS TABLE (
  id uuid,
  amount integer,
  currency text,
  status text,
  user_email text,
  plan_name text,
  payment_method text,
  midtrans_order_id text,
  midtrans_transaction_id text,
  subscription_status text,
  created_at timestamptz,
  paid_at timestamptz,
  code text,
  original_amount integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 
    p.id,
    p.amount,
    p.currency,
    p.status,
    COALESCE(au.email, 'Unknown') as user_email,
    COALESCE(sp.name, 'N/A') as plan_name,
    p.payment_method,
    p.midtrans_order_id,
    p.midtrans_transaction_id,
    COALESCE(s.status, 'N/A') as subscription_status,
    p.created_at,
    p.paid_at,
    dc.code,
    cdb.original_amount
  FROM public.payments p
  LEFT JOIN public.discount_codes dc ON p.discount_code_id = dc.id
  LEFT JOIN auth.users au ON p.user_id = au.id
  LEFT JOIN public.subscriptions s ON p.subscription_id = s.id
  LEFT JOIN public.creator_discount_benefits cdb ON s.id = cdb.subscription_id 
  LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE p.is_production = true
  ORDER BY p.created_at DESC
  LIMIT 100;
$$;