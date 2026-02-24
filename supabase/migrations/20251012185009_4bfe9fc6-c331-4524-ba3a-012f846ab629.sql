-- Delete excess lesson content, keeping only first 5 items per module for testing
DELETE FROM lesson_content
WHERE id IN (
  SELECT lc.id
  FROM lesson_content lc
  INNER JOIN lesson_modules lm ON lc.module_id = lm.id
  INNER JOIN lessons l ON lm.lesson_id = l.id
  WHERE l.is_production = true
  AND lc.order_index >= 5
);

-- Also limit modules to first 2 per lesson for consistency
DELETE FROM lesson_modules
WHERE id IN (
  SELECT lm.id
  FROM lesson_modules lm
  INNER JOIN lessons l ON lm.lesson_id = l.id
  WHERE l.is_production = true
  AND lm.order_index >= 2
);