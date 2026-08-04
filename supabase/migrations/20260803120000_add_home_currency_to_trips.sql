-- Add a dedicated home_currency column to trips while keeping compatibility
-- with existing currency_settings JSON data.
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS home_currency varchar(3);

-- Backfill home_currency from currency_settings.home_currency when present.
UPDATE public.trips
SET home_currency = UPPER(NULLIF(TRIM(currency_settings ->> 'home_currency'), ''))
WHERE home_currency IS NULL
  AND currency_settings ? 'home_currency'
  AND NULLIF(TRIM(currency_settings ->> 'home_currency'), '') IS NOT NULL;

COMMENT ON COLUMN public.trips.home_currency IS 'Trip home currency (ISO 4217 code), extracted from currency_settings.home_currency when available.';