-- Update the RLS policy for user_follows to allow the special Arrangely follower UUID
DROP POLICY IF EXISTS "Users can create their own follows" ON public.user_follows;

CREATE POLICY "Users can create their own follows" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (
  auth.uid() = follower_id OR 
  follower_id = '99999999-9999-9999-9999-999999999999'::uuid
);

-- Also update the delete policy to allow unfollowing Arrangely
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.user_follows;

CREATE POLICY "Users can delete their own follows" 
ON public.user_follows 
FOR DELETE 
USING (
  auth.uid() = follower_id OR 
  follower_id = '99999999-9999-9999-9999-999999999999'::uuid
);