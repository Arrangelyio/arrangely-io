-- Add fee configuration columns to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS admin_fee_amount integer DEFAULT 5000,
ADD COLUMN IF NOT EXISTS admin_fee_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_fee_paid_by_customer boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_fee_amount integer DEFAULT 3000,
ADD COLUMN IF NOT EXISTS platform_fee_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS platform_fee_paid_by_customer boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS vat_tax_percentage numeric(5,2) DEFAULT 11.00,
ADD COLUMN IF NOT EXISTS vat_tax_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS vat_tax_paid_by_customer boolean DEFAULT true;

COMMENT ON COLUMN public.events.admin_fee_amount IS 'Admin fee in smallest currency unit (e.g., cents for IDR)';
COMMENT ON COLUMN public.events.admin_fee_paid_by_customer IS 'If true, customer pays; if false, promoter covers';
COMMENT ON COLUMN public.events.platform_fee_amount IS 'Platform fee in smallest currency unit';
COMMENT ON COLUMN public.events.platform_fee_paid_by_customer IS 'If true, customer pays; if false, promoter covers';
COMMENT ON COLUMN public.events.vat_tax_percentage IS 'VAT/PPN tax percentage (e.g., 11 for 11%)';
COMMENT ON COLUMN public.events.vat_tax_paid_by_customer IS 'If true, customer pays; if false, promoter covers';