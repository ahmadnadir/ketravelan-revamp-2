/*
  # Add Tags Column to Trips Table

  1. Changes
    - Add `tags` column to `trips` table as text array
    - This allows trips to have multiple category tags (e.g., "Beach", "Nature & Outdoor", "Food & Culinary")
  
  2. Notes
    - Uses text array type for flexibility
    - Default is empty array
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'tags'
  ) THEN
    ALTER TABLE trips ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;
