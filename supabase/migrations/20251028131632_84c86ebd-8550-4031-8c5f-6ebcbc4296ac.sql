-- Remove duplicate entries, keeping only the most recent one for each user_id+payment_method
DELETE FROM public.linked_payment_accounts
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, payment_method) id
  FROM public.linked_payment_accounts
  ORDER BY user_id, payment_method, created_at DESC
);

-- Add unique constraint for user_id and payment_method
ALTER TABLE public.linked_payment_accounts
ADD CONSTRAINT linked_payment_accounts_user_payment_unique 
UNIQUE (user_id, payment_method);