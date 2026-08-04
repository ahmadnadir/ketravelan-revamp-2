-- Keep trips.home_currency and trips.currency_settings.home_currency synchronized.
-- This protects behavior even when some clients only write one side.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trips'
      AND column_name = 'home_currency'
  ) THEN
    -- Backfill missing dedicated column values from JSON settings.
    UPDATE public.trips
    SET home_currency = UPPER(NULLIF(TRIM(currency_settings ->> 'home_currency'), ''))
    WHERE (home_currency IS NULL OR TRIM(home_currency) = '')
      AND currency_settings ? 'home_currency'
      AND NULLIF(TRIM(currency_settings ->> 'home_currency'), '') IS NOT NULL;

    CREATE OR REPLACE FUNCTION public.sync_trips_home_currency_bidirectional()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      normalized_home text;
      settings_home text;
    BEGIN
      normalized_home := NULLIF(UPPER(TRIM(COALESCE(NEW.home_currency, ''))), '');
      settings_home := NULLIF(UPPER(TRIM(COALESCE(NEW.currency_settings ->> 'home_currency', ''))), '');

      -- If app writes the dedicated column, mirror it into JSON.
      IF normalized_home IS NOT NULL THEN
        NEW.home_currency := normalized_home;
        NEW.currency_settings := COALESCE(NEW.currency_settings, '{}'::jsonb);
        NEW.currency_settings := jsonb_set(
          NEW.currency_settings,
          '{home_currency}',
          to_jsonb(normalized_home),
          true
        );
        RETURN NEW;
      END IF;

      -- If app writes JSON only, mirror it into dedicated column.
      IF settings_home IS NOT NULL THEN
        NEW.home_currency := settings_home;
      END IF;

      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_sync_trips_home_currency_bidirectional ON public.trips;

    CREATE TRIGGER trg_sync_trips_home_currency_bidirectional
    BEFORE INSERT OR UPDATE OF home_currency, currency_settings
    ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_trips_home_currency_bidirectional();
  END IF;
END $$;