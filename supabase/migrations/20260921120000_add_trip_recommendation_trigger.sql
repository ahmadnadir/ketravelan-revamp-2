-- Trigger trip recommendations from the database publish event.
-- The Edge Function accepts only the internal service-role credential.

CREATE EXTENSION IF NOT EXISTS http;

CREATE OR REPLACE FUNCTION public.send_trip_recommendation_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'published'
     AND NEW.visibility = 'public'
     AND (
       TG_OP = 'INSERT'
       OR OLD.status IS DISTINCT FROM 'published'
       OR OLD.visibility IS DISTINCT FROM 'public'
     ) THEN
    BEGIN
      PERFORM net.http_post(
        url := (current_setting('app.settings.supabase_url', true) || '/functions/v1/send-trip-recommendation')::text,
        body := jsonb_build_object('tripId', NEW.id),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send trip recommendation: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_recommendation_on_publish_trigger ON public.trips;

CREATE TRIGGER trip_recommendation_on_publish_trigger
AFTER INSERT OR UPDATE OF status, visibility ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.send_trip_recommendation_on_publish();