-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT get_current_environment()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for password reset tokens (admin only)
CREATE POLICY "Admin can manage password reset tokens" 
ON public.password_reset_tokens 
FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email_token 
ON public.password_reset_tokens(email, token);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at 
ON public.password_reset_tokens(expires_at);

-- Add trigger for updated_at
CREATE TRIGGER update_password_reset_tokens_updated_at
BEFORE UPDATE ON public.password_reset_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();