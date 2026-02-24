-- Drop existing insert policy that's not working correctly
DROP POLICY IF EXISTS "System can insert certificates" ON public.lesson_certificates;

-- Create proper policy allowing users to insert their own certificates
CREATE POLICY "Users can insert their own certificates" 
ON public.lesson_certificates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);