-- Add sample QR codes to existing registrations for testing
UPDATE event_registrations 
SET qr_code = 'QR-SAMPLE-001-' || id::text
WHERE event_id IN (
  SELECT id FROM events WHERE title = 'Worship Night & Music Workshop'
) 
AND qr_code IS NULL
LIMIT 5;