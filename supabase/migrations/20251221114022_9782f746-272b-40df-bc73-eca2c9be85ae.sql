-- Add device_id column to push_notification_tokens table
ALTER TABLE public.push_notification_tokens 
ADD COLUMN IF NOT EXISTS device_id text;

-- Create unique constraint on user_id + device_id (one token per device per user)
CREATE UNIQUE INDEX IF NOT EXISTS push_notification_tokens_user_device_idx 
ON public.push_notification_tokens(user_id, device_id);