-- Add lesson_id column to payments table for lesson payments
ALTER TABLE public.payments 
ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL;