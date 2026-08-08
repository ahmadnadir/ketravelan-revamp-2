/*
  # Harden Trip Slug Allocation (RLS + Manual Input + Concurrency)

  ## Problem
  Duplicate key violations on trips.slug can still occur when slug allocation queries
  cannot see all rows under RLS, or when manual slug inputs bypass the locked path.

  ## Fix
  - Centralize slug allocation in a SECURITY DEFINER function.
  - Always normalize and allocate through one path for INSERT and slug/title changes.
  - Serialize allocation per base slug using advisory transaction locks.
  - Exclude current row during UPDATE uniqueness checks.
*/

CREATE OR REPLACE FUNCTION public.allocate_unique_trip_slug(
  p_title text,
  p_slug text DEFAULT NULL,
  p_exclude_trip_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_input text;
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  raw_input := COALESCE(NULLIF(btrim(p_slug), ''), COALESCE(p_title, ''));

  -- Normalize to URL-safe slug.
  base_slug := lower(raw_input);
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' FROM base_slug);

  IF base_slug = '' THEN
    base_slug := 'trip';
  END IF;

  -- Serialize allocators competing for the same base slug.
  PERFORM pg_advisory_xact_lock(hashtextextended('trip_slug:' || base_slug, 0));

  final_slug := base_slug;

  WHILE EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.slug = final_slug
      AND (p_exclude_trip_id IS NULL OR t.id <> p_exclude_trip_id)
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
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := public.allocate_unique_trip_slug(NEW.title, NEW.slug, NULL);
    RETURN NEW;
  END IF;

  -- UPDATE path:
  -- Reallocate only when slug/title changed; preserve current slug otherwise.
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.slug IS DISTINCT FROM OLD.slug
  THEN
    NEW.slug := public.allocate_unique_trip_slug(NEW.title, NEW.slug, NEW.id);
  ELSE
    NEW.slug := OLD.slug;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_trip_slug ON public.trips;
CREATE TRIGGER trigger_set_trip_slug
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_trip_slug();

-- Backfill rows where slug is null/blank through the same allocator.
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT t.id, t.title, t.slug
    FROM public.trips t
    WHERE t.slug IS NULL OR btrim(t.slug) = ''
    ORDER BY t.created_at, t.id
  LOOP
    UPDATE public.trips t
    SET slug = public.allocate_unique_trip_slug(rec.title, rec.slug, rec.id)
    WHERE t.id = rec.id;
  END LOOP;
END;
$$;

-- Reduce execute surface area while keeping trigger functionality.
REVOKE ALL ON FUNCTION public.allocate_unique_trip_slug(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_unique_trip_slug(text, text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_trip_slug() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_trip_slug() TO authenticated, service_role;
