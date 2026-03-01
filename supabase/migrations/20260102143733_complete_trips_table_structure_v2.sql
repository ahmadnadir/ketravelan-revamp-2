/*
  # Complete Trips Table Structure (v2)
  
  This migration ensures the trips table has all columns from the original schema:
  
  ## Changes
  
  1. **Add All Missing Columns**
     - meeting_point, difficulty_level, payment_terms
     - faqs, rating_average, rating_count, rating_distribution
     - psa, tip_services, payment_qr_code, budget_breakdown
     - stops, trips_date, budget_mode, details, itinerary_type
  
  2. **Add Constraints**
     - Difficulty level check constraint
  
  ## Notes
  - Uses IF NOT EXISTS checks to avoid errors
  - Sets proper defaults
*/

-- Add all missing columns to trips table
DO $$
BEGIN
  -- Core trip details columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'meeting_point'
  ) THEN
    ALTER TABLE trips ADD COLUMN meeting_point text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'difficulty_level'
  ) THEN
    ALTER TABLE trips ADD COLUMN difficulty_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE trips ADD COLUMN payment_terms text;
  END IF;

  -- FAQ and ratings columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'faqs'
  ) THEN
    ALTER TABLE trips ADD COLUMN faqs jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'rating_distribution'
  ) THEN
    ALTER TABLE trips ADD COLUMN rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb;
  END IF;

  -- Payment and service columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'psa'
  ) THEN
    ALTER TABLE trips ADD COLUMN psa text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'tip_services'
  ) THEN
    ALTER TABLE trips ADD COLUMN tip_services text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'payment_qr_code'
  ) THEN
    ALTER TABLE trips ADD COLUMN payment_qr_code text;
  END IF;

  -- Budget and planning columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'budget_breakdown'
  ) THEN
    ALTER TABLE trips ADD COLUMN budget_breakdown jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'budget_mode'
  ) THEN
    ALTER TABLE trips ADD COLUMN budget_mode text;
  END IF;

  -- Route and date columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'stops'
  ) THEN
    ALTER TABLE trips ADD COLUMN stops text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'trips_date'
  ) THEN
    ALTER TABLE trips ADD COLUMN trips_date text;
  END IF;

  -- Additional details columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'details'
  ) THEN
    ALTER TABLE trips ADD COLUMN details text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'itinerary_type'
  ) THEN
    ALTER TABLE trips ADD COLUMN itinerary_type text;
  END IF;
END $$;

-- Add difficulty level constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trips_difficulty_level_check'
  ) THEN
    ALTER TABLE trips
    ADD CONSTRAINT trips_difficulty_level_check
    CHECK (
      difficulty_level IS NULL OR
      difficulty_level = ANY (ARRAY['easy'::text, 'moderate'::text, 'challenging'::text, 'difficult'::text])
    );
  END IF;
END $$;
