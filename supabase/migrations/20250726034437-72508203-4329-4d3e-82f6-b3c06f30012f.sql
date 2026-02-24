-- Add RLS policy to allow live preview access to setlists
CREATE POLICY "Allow live preview access to setlists" 
ON public.setlists 
FOR SELECT 
TO authenticated
USING (is_live_preview_context() = true);