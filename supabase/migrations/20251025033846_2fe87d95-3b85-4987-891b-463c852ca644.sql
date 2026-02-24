-- Add new fields to payments table for Core API support
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS va_number TEXT,
ADD COLUMN IF NOT EXISTS payment_code TEXT,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS deeplink_url TEXT,
ADD COLUMN IF NOT EXISTS actions JSONB,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster active payment queries
CREATE INDEX IF NOT EXISTS idx_payments_user_lesson_status 
ON public.payments(user_id, lesson_id, status) 
WHERE status IN ('pending', 'waiting');

-- Add index for expired payments cleanup
CREATE INDEX IF NOT EXISTS idx_payments_expires_at 
ON public.payments(expires_at) 
WHERE status IN ('pending', 'waiting');