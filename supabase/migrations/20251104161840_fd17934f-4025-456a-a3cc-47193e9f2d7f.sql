-- Change admin_fee_amount column to numeric type to support percentage fees like 3.5%
ALTER TABLE public.events 
ALTER COLUMN admin_fee_amount TYPE numeric USING admin_fee_amount::numeric;