-- Add blast_unique_id column to email_jobs table
ALTER TABLE email_jobs
ADD COLUMN blast_unique_id text;

-- Add index on blast_unique_id for faster queries
CREATE INDEX idx_email_jobs_blast_unique_id ON email_jobs(blast_unique_id);

-- Add index on created_at for sorting
CREATE INDEX idx_email_jobs_created_at ON email_jobs(created_at DESC);