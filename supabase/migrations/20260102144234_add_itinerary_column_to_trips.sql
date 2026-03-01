/*
  # Add itinerary column to trips table

  1. Changes
    - Add `itinerary` column (jsonb) to store trip itinerary data
    - Default to empty array for consistency

  2. Notes
    - Using jsonb for flexible itinerary structure
    - Allows storing day-by-day itinerary with activities, times, locations, etc.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'itinerary'
  ) THEN
    ALTER TABLE trips ADD COLUMN itinerary jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;