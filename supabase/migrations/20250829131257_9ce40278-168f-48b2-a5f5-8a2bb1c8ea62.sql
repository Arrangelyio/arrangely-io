-- Add sample QR codes to existing registrations
UPDATE event_registrations 
SET qr_code = 'QR-SAMPLE-001' 
WHERE id IN (
  SELECT id FROM event_registrations 
  WHERE event_id IN (
    SELECT id FROM events WHERE title = 'Worship Night & Music Workshop'
  ) 
  AND qr_code IS NULL
  ORDER BY id
  LIMIT 1
);