-- Create support_chat_settings table for managing floating chat widget
CREATE TABLE public.support_chat_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_production boolean NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.support_chat_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat settings"
ON public.support_chat_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat settings"
ON public.support_chat_settings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat settings"
ON public.support_chat_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to get or create chat settings
CREATE OR REPLACE FUNCTION public.get_chat_settings(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(
    (SELECT is_enabled FROM public.support_chat_settings WHERE support_chat_settings.user_id = $1),
    true  -- Default to enabled if no setting exists
  );
$function$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_support_chat_settings_updated_at
BEFORE UPDATE ON public.support_chat_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();