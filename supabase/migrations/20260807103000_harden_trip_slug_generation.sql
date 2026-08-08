/*
  # Harden Trip Slug Generation

  ## Why
  - Some titles can normalize to an empty slug (for example symbol-only or non-Latin-only strings).
  - Empty slug values can violate the unique constraint on subsequent inserts.

  ## What
  - Replace slug generation logic to:
    - Treat non-alphanumeric runs as separators.
    - Trim duplicate separators.
    - Fallback to `trip` when normalization is empty.
    - Preserve uniqueness with numeric suffixes.
*/

CREATE OR REPLACE FUNCTION public.generate_unique_slug(title text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  input_title text;
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  input_title := COALESCE(title, '');

  -- Normalize title: lowercase and replace non a-z0-9 sequences with a single hyphen.
  base_slug := lower(input_title);
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' FROM base_slug);

  -- Guarantee non-empty slug.
  IF base_slug = '' THEN
    base_slug := 'trip';
  END IF;

  final_slug := base_slug;

  -- Ensure uniqueness by appending numeric suffix.
  WHILE EXISTS (
    SELECT 1
    FROM public.trips
    WHERE slug = final_slug
  ) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN final_slug;
END;
$$;
