-- Create request_arrangements table
CREATE TABLE public.request_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  youtube_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.request_arrangements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create requests
CREATE POLICY "Users can create arrangement requests"
ON public.request_arrangements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own requests
CREATE POLICY "Users can view their own requests"
ON public.request_arrangements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all requests
CREATE POLICY "Admins can view all requests"
ON public.request_arrangements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_request_arrangements_user_id ON public.request_arrangements(user_id);
CREATE INDEX idx_request_arrangements_status ON public.request_arrangements(status);
CREATE INDEX idx_request_arrangements_created_at ON public.request_arrangements(created_at DESC);


-- Add columns for request assignment tracking if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'request_arrangements' AND column_name = 'assigned_to') THEN
    ALTER TABLE public.request_arrangements ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'request_arrangements' AND column_name = 'status') THEN
    ALTER TABLE public.request_arrangements ADD COLUMN status text NOT NULL DEFAULT 'pending';
    ALTER TABLE public.request_arrangements ADD CONSTRAINT check_status CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'request_arrangements' AND column_name = 'assigned_at') THEN
    ALTER TABLE public.request_arrangements ADD COLUMN assigned_at timestamp with time zone;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'request_arrangements' AND column_name = 'completed_at') THEN
    ALTER TABLE public.request_arrangements ADD COLUMN completed_at timestamp with time zone;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'request_arrangements' AND column_name = 'admin_notes') THEN
    ALTER TABLE public.request_arrangements ADD COLUMN admin_notes text;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_request_arrangements_status ON public.request_arrangements(status);
CREATE INDEX IF NOT EXISTS idx_request_arrangements_assigned_to ON public.request_arrangements(assigned_to);