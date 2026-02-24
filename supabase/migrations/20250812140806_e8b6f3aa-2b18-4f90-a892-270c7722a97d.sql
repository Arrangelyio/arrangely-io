CREATE POLICY "Enable insert for admin users only"
ON public.discount_codes
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'::user_role
  )
);