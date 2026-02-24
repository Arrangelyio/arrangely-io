
-- Delete duplicate and extra content, keeping only 3 videos for lesson 438206ed-c4aa-4608-9b9d-1fceaa90bdfb
DELETE FROM lesson_content 
WHERE id NOT IN (
  '3c592b23-af30-4ab9-8d3e-2df700b02e2c',  -- Welcome to Piano Basics
  '6762d43c-915b-4603-bae5-1d35fa250731',  -- Understanding Piano Keys
  '9f9f3659-c566-4477-b5a5-575cfc524cbe'   -- C Major Scale Tutorial
) 
AND module_id IN (
  SELECT id FROM lesson_modules 
  WHERE lesson_id = '438206ed-c4aa-4608-9b9d-1fceaa90bdfb'
);

-- Update order indices for remaining content
UPDATE lesson_content 
SET order_index = 0 
WHERE id = '3c592b23-af30-4ab9-8d3e-2df700b02e2c';

UPDATE lesson_content 
SET order_index = 1 
WHERE id = '6762d43c-915b-4603-bae5-1d35fa250731';

UPDATE lesson_content 
SET order_index = 2 
WHERE id = '9f9f3659-c566-4477-b5a5-575cfc524cbe';
