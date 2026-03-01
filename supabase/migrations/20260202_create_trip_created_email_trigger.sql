-- Enable http extension for making HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS http;

-- Create trigger function to send trip created email
CREATE OR REPLACE FUNCTION send_trip_created_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send email when trip status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Fire the email function asynchronously
    BEGIN
      PERFORM net.http_post(
        url := (current_setting('app.settings.supabase_url', true) || '/functions/v1/send-trip-created-email')::text,
        body := jsonb_build_object('tripId', NEW.id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the trigger
      RAISE WARNING 'Failed to send trip created email: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS trip_created_email_trigger ON trips;

-- Create trigger on trips table
CREATE TRIGGER trip_created_email_trigger
AFTER INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION send_trip_created_email();
