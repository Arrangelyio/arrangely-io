-- Add isNewCustomer column to discount_codes table
ALTER TABLE public.discount_codes 
ADD COLUMN is_new_customer BOOLEAN NOT NULL DEFAULT false;