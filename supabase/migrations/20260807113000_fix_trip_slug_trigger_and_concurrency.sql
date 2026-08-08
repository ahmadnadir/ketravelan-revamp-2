/*
  # Fix Trip Slug Unique Violations (Trigger + Concurrency)

  ## Why
  - Unique violations can still happen when:
    1) `slug` is provided as empty string (not NULL), so old trigger logic skips regeneration.
    2) Two concurrent inserts generate the same slug before either commit.

  ## What
  - Harden `generate_unique_slug` with an advisory transaction lock by base slug.
  - Harden `set_trip_slug` to regenerate when `slug` is NULL or blank.
  - Recreate slug trigger to ensure function is active.
  - Backfill existing rows with NULL/blank slug values safely.
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

  -- Serialize slug generation per base slug in this transaction
  -- to avoid concurrent duplicate outputs.
  PERFORM pg_advisory_xact_lock(hashtext(base_slug)::bigint);

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

CREATE OR REPLACE FUNCTION public.set_trip_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Regenerate when slug is missing/blank, or when title changed.
  IF NEW.slug IS NULL
     OR btrim(NEW.slug) = ''
     OR (TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title)
  THEN
    NEW.slug := public.generate_unique_slug(NEW.title);
  ELSE
    -- Keep user-provided slug normalized.
    NEW.slug := lower(btrim(NEW.slug));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_trip_slug ON public.trips;
CREATE TRIGGER trigger_set_trip_slug
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_slug();

DO $$
DECLARE
  rec record;
BEGIN
  -- Backfill null/blank slugs one row at a time to preserve uniqueness.
  FOR rec IN
    SELECT id, title
    FROM public.trips
    WHERE slug IS NULL OR btrim(slug) = ''
    ORDER BY created_at, id
  LOOP
    UPDATE public.trips
    SET slug = public.generate_unique_slug(rec.title)
    WHERE id = rec.id;
  END LOOP;
END;
$$;
