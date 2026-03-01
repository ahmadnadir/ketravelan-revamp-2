/*
  # Add Slug Column to Trips Table

  1. New Columns
    - `slug` (text, unique) - URL-friendly identifier generated from trip title
  
  2. New Functions
    - `generate_unique_slug(title text)` - Generates a unique slug from title with number suffix if needed
    - `set_trip_slug()` - Trigger function to automatically generate slug on insert/update
  
  3. Security
    - Slug must be unique
    - Automatically generated from title with number suffix for duplicates
  
  4. Notes
    - Existing trips will have slugs generated automatically
    - New trips will have slugs auto-generated on insert
*/

-- Add slug column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'slug'
  ) THEN
    ALTER TABLE trips ADD COLUMN slug text UNIQUE;
  END IF;
END $$;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_trips_slug ON trips(slug);

-- Function to generate unique slug from title
CREATE OR REPLACE FUNCTION generate_unique_slug(title text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Convert title to lowercase, replace spaces/special chars with hyphens
  base_slug := lower(trim(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g')));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check if slug exists and add number suffix if needed
  WHILE EXISTS (SELECT 1 FROM trips WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to set slug on insert/update
CREATE OR REPLACE FUNCTION set_trip_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if it's not provided or title changed
  IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.title != NEW.title) THEN
    NEW.slug := generate_unique_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_trip_slug ON trips;
CREATE TRIGGER trigger_set_trip_slug
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION set_trip_slug();

-- Update existing trips with slugs
UPDATE trips SET slug = generate_unique_slug(title) WHERE slug IS NULL;
