-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (if not already granted)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_name = 'pg_cron') THEN
    GRANT USAGE ON SCHEMA cron TO postgres;
  END IF;
END$$;

-- Schedule send-scheduled-reminders to run daily at 12 AM UTC (midnight)
-- This will create the job only if it doesn't already exist
SELECT cron.schedule('send-trip-reminders-daily', '0 0 * * *', 'SELECT http_post(''https://sspvqhleqlycsiniywkg.functions.supabase.co/functions/v1/send-scheduled-reminders'', ''{}''::jsonb, ''{"Content-Type":"application/json"}'');');

