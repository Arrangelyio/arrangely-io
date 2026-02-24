-- Add masked_number column to linked_payment_accounts for displaying partial payment info
ALTER TABLE public.linked_payment_accounts
ADD COLUMN IF NOT EXISTS masked_number TEXT;

-- Add comment
COMMENT ON COLUMN public.linked_payment_accounts.masked_number IS 'Partially masked display of payment account (e.g., last 4 digits of card or phone)';