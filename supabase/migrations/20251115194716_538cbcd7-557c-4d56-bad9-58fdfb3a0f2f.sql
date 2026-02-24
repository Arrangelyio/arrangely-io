-- Insert dummy pricing data for sequencer files that don't have pricing yet
INSERT INTO public.sequencer_file_pricing (
  sequencer_file_id,
  price,
  currency,
  is_active,
  is_production
)
SELECT 
  sf.id,
  50000, -- Default price: 50,000 IDR
  'IDR',
  true,
  sf.is_production
FROM public.sequencer_files sf
WHERE sf.is_production = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.sequencer_file_pricing sfp 
    WHERE sfp.sequencer_file_id = sf.id 
      AND sfp.is_production = sf.is_production
  )
ON CONFLICT (sequencer_file_id, is_production) DO NOTHING;

ALTER TABLE payments
ADD CONSTRAINT payments_payment_type_check
CHECK (
  payment_type = ANY (
    ARRAY[
      'lesson'::text,
      'event'::text,
      'subscription'::text,
      'one_time'::text,
      'sequencer'::text
    ]
  )
);

ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_sequencer_id_fkey;

ALTER TABLE payments
ADD CONSTRAINT payments_sequencer_id_fkey
FOREIGN KEY (sequencer_id)
REFERENCES sequencer_files(id)
ON DELETE SET NULL;

ALTER TABLE sequencer_enrollments
ADD CONSTRAINT sequencer_enrollments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;