-- Add email and phone columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS organizer_email text,
ADD COLUMN IF NOT EXISTS organizer_phone text;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions to use pg_net
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA net TO postgres, anon, authenticated, service_role;

-- Then set up the cron jobs
SELECT cron.schedule(
  'weekly-community-recap',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url:='https://jowuhdfznveuopeqwzzd.supabase.co/functions/v1/send-weekly-recap',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd3VoZGZ6bnZldW9wZXF3enpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjEyMjMsImV4cCI6MjA2ODgzNzIyM30.KFMkZdBXK5X-LY0r8xreRe2CxvkC3G1o9lFq_ZTeZ8A"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'subscription-reminder-7days',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://jowuhdfznveuopeqwzzd.supabase.co/functions/v1/send-subscription-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd3VoZGZ6bnZldW9wZXF3enpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjEyMjMsImV4cCI6MjA2ODgzNzIyM30.KFMkZdBXK5X-LY0r8xreRe2CxvkC3G1o9lFq_ZTeZ8A"}'::jsonb,
    body:='{"daysBeforeExpiry": 7}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'subscription-reminder-3day',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://jowuhdfznveuopeqwzzd.supabase.co/functions/v1/send-subscription-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd3VoZGZ6bnZldW9wZXF3enpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjEyMjMsImV4cCI6MjA2ODgzNzIyM30.KFMkZdBXK5X-LY0r8xreRe2CxvkC3G1o9lFq_ZTeZ8A"}'::jsonb,
    body:='{"daysBeforeExpiry": 3}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'subscription-reminder-0day',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url:='https://jowuhdfznveuopeqwzzd.supabase.co/functions/v1/send-subscription-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd3VoZGZ6bnZldW9wZXF3enpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjEyMjMsImV4cCI6MjA2ODgzNzIyM30.KFMkZdBXK5X-LY0r8xreRe2CxvkC3G1o9lFq_ZTeZ8A"}'::jsonb,
    body:='{"daysBeforeExpiry": 0}'::jsonb
  ) as request_id;
  $$
);
