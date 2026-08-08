/*
  # Trip Slug: Custom Duplicate Error Message

  ## Goal
  - Keep the earlier slug-fix behavior.
  - Raise a deterministic duplicate-slug error with:
      ERROR: duplicate key value violates unique constraint "trips_slug_key"
      DETAIL: Key (slug)=(<slug>) already exists.

  ## Notes
  - Uses SQLSTATE 23505 (unique_violation) for compatibility with existing clients.
  - Keeps trigger-based slug generation and normalization.
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

  -- Serialize slug generation per base slug in this transaction.
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate_slug text;
BEGIN
  -- Earlier behavior: auto-generate when missing/blank or title changed.
  IF NEW.slug IS NULL
     OR btrim(NEW.slug) = ''
     OR (TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title)
  THEN
    candidate_slug := public.generate_unique_slug(NEW.title);
  ELSE
    -- Keep user-provided slug normalized.
    candidate_slug := lower(btrim(NEW.slug));

    -- Serialize manual slug claims too.
    PERFORM pg_advisory_xact_lock(hashtext(candidate_slug)::bigint);
  END IF;

  -- Raise custom duplicate message before unique index check.
  IF EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.slug = candidate_slug
      AND (TG_OP = 'INSERT' OR t.id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'duplicate key value violates unique constraint "trips_slug_key"'
      USING ERRCODE = '23505',
            DETAIL = format('Key (slug)=(%s) already exists.', candidate_slug);
  END IF;

  NEW.slug := candidate_slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_trip_slug ON public.trips;
CREATE TRIGGER trigger_set_trip_slug
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_slug();
