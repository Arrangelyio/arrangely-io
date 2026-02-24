
-- Create error_logs table for centralized error tracking
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  operation_type TEXT NOT NULL, -- e.g., 'auth', 'database', 'api'
  table_name TEXT, -- which table was being accessed if applicable
  stack_trace TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX idx_error_logs_operation_type ON public.error_logs(operation_type);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own error logs
CREATE POLICY "Users can insert their own error logs" 
  ON public.error_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow authenticated users to view their own error logs
CREATE POLICY "Users can view their own error logs" 
  ON public.error_logs 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow service role to view all error logs (for admin purposes)
CREATE POLICY "Service role can view all error logs" 
  ON public.error_logs 
  FOR ALL 
  USING (current_setting('role') = 'service_role');
