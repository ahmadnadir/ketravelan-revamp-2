-- Fix countries_visited trigger functions to avoid unqualified relation lookups.

CREATE OR REPLACE FUNCTION public.recalculate_user_countries_visited_v2(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_country_count integer;
BEGIN
  SELECT COUNT(DISTINCT distinct_destinations.destination)
  INTO v_country_count
  FROM (
    SELECT DISTINCT t.destination
    FROM public.trips t
    WHERE t.creator_id = p_user_id
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination != ''

    UNION ALL

    SELECT DISTINCT t.destination
    FROM public.trips t
    INNER JOIN public.trip_members tm ON t.id = tm.trip_id
    WHERE tm.user_id = p_user_id
      AND tm.left_at IS NULL
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination != ''
  ) AS distinct_destinations;

  UPDATE public.profiles
  SET countries_visited = COALESCE(v_country_count, 0),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_trip_member_joined_update_countries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_user_countries_visited_v2(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_trip_member_left_update_countries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    PERFORM public.recalculate_user_countries_visited_v2(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;
