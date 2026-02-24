-- Add original_price column to lessons table for discount pricing feature
ALTER TABLE lessons
ADD COLUMN original_price INTEGER DEFAULT NULL;

COMMENT ON COLUMN lessons.original_price IS 'Original price before discount. When set along with price, original_price will be shown with strikethrough and price as the discounted price.';