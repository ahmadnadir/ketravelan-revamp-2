-- Set default of trips.currency_settings to empty list of travel_currencies
ALTER TABLE trips
ALTER COLUMN currency_settings SET DEFAULT jsonb_build_object(
  'travel_currencies', ARRAY[]::text[]
);

-- Optional backfill: normalize records with null or missing travel_currencies
UPDATE trips
SET currency_settings = jsonb_build_object('travel_currencies', ARRAY[]::text[])
WHERE currency_settings IS NULL
   OR (currency_settings ? 'travel_currencies' = FALSE);
