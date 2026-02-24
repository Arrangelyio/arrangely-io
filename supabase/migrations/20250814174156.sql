ALTER TABLE songs
ADD COLUMN status TEXT;

CREATE POLICY "Admins can manage discount codes" 
ON public.discount_codes 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'::user_role
));

-- Drop the function if it exists
DROP FUNCTION IF EXISTS is_benefit_period_active(BIGINT);

-- Create the function
CREATE OR REPLACE FUNCTION is_benefit_period_active(p_config_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT
      CASE
        -- Case 1: No date range defined, rely only on the 'is_active' flag
        WHEN period_start_date IS NULL AND period_end_date IS NULL THEN
          is_active

        -- Case 2: Only an end date is defined
        WHEN period_start_date IS NULL THEN
          (now() <= (period_end_date + interval '1 day' - interval '1 millisecond') AND is_active)

        -- Case 3: Only a start date is defined (period runs indefinitely)
        WHEN period_end_date IS NULL THEN
          (now() >= period_start_date AND is_active)

        -- Case 4: Both start and end dates are defined
        ELSE
          (now() BETWEEN period_start_date AND (period_end_date + interval '1 day' - interval '1 millisecond'))
          AND is_active
      END
    FROM
      public.creator_benefit_configs
    WHERE
      id = p_config_id
  );
END;
$$ LANGUAGE plpgsql STABLE;
