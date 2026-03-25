-- Add per-trip currency settings column
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS currency_settings jsonb NOT NULL DEFAULT jsonb_build_object(
  'travel_currencies', ARRAY['USD','IDR']
);

COMMENT ON COLUMN trips.currency_settings IS 'JSON settings: {"travel_currencies": ["USD", ...], "home_currency": "MYR" (optional)}';

-- Optional: allow trip members to update currency settings (RLS must be enabled on trips)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'trip_members_update_currency_settings'
  ) THEN
    CREATE POLICY trip_members_update_currency_settings ON trips
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM trip_members tm
          WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid() AND tm.is_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trip_members tm
          WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid() AND tm.is_admin = true
        )
      );
  END IF;
END $$;