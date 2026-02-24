-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule recurring payments processing to run every day at 2 AM UTC
SELECT cron.schedule(
  'process-recurring-payments-daily',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://tmseyrcoxbwhztvvivgl.supabase.co/functions/v1/process-recurring-payments',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtc2V5cmNveGJ3aHp0dnZpdmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTcwMDUsImV4cCI6MjA2Nzk5MzAwNX0.MtZT0jqsKOrhj75OuN4if7_5CEmTBb84gACpekPyMgw"}'::jsonb,
        body:=concat('{"scheduled_run": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Schedule a more frequent check during business hours (every 6 hours from 6 AM to 6 PM UTC)
SELECT cron.schedule(
  'process-recurring-payments-business-hours',
  '0 6,12,18 * * *', -- At 6 AM, 12 PM, and 6 PM UTC
  $$
  SELECT
    net.http_post(
        url:='https://tmseyrcoxbwhztvvivgl.supabase.co/functions/v1/process-recurring-payments',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtc2V5cmNveGJ3aHp0dnZpdmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTcwMDUsImV4cCI6MjA2Nzk5MzAwNX0.MtZT0jqsKOrhj75OuN4if7_5CEmTBb84gACpekPyMgw"}'::jsonb,
        body:=concat('{"scheduled_run": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);