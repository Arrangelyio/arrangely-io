ALTER TABLE creator_benefits
DROP CONSTRAINT creator_benefits_benefit_type_check;

ALTER TABLE creator_benefits
ADD CONSTRAINT creator_benefits_benefit_type_check
CHECK (
  benefit_type = ANY (
    ARRAY['song_publish'::text, 'library_add'::text, 'discount_code'::text]
  )
);
