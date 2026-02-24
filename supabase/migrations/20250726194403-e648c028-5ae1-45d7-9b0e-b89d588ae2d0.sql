-- Update RLS policies for performance_sessions to allow public access for demo purposes
DROP POLICY IF EXISTS "Performance sessions are viewable by everyone" ON public.performance_sessions;
DROP POLICY IF EXISTS "Users can create performance sessions" ON public.performance_sessions;
DROP POLICY IF EXISTS "Users can update performance sessions" ON public.performance_sessions;

-- Create new policies that allow public access
CREATE POLICY "Public can view active sessions" 
ON public.performance_sessions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Anyone can create demo sessions" 
ON public.performance_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update demo sessions" 
ON public.performance_sessions 
FOR UPDATE 
USING (true);