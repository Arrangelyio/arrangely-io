-- Create RLS policy for payments table to allow only status cancellation
-- First, enable RLS on payments table if not already enabled
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;

-- Create policy that only allows updating status to 'cancelled'
CREATE POLICY "Users can cancel their pending payments"
ON payments
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND status IN ('pending', 'processing')
)
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'cancelled'
);