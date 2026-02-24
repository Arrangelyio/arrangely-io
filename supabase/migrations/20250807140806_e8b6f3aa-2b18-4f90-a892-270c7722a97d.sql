-- Add telegram_topic_id column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS telegram_topic_id INTEGER;