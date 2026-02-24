-- Update file size limit for sequencer-files bucket to 500MB
UPDATE storage.buckets 
SET file_size_limit = 524288000 -- 500MB in bytes
WHERE id = 'sequencer-files';