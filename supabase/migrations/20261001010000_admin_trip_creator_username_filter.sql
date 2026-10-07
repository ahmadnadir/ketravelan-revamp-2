CREATE OR REPLACE FUNCTION public.admin_find_trip_creator(p_username text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_creator_id uuid;
  v_username text := lower(trim(both '@' from btrim(coalesce(p_username, ''))));
BEGIN
  IF NOT public.admin_has_permission('trips.view') THEN
    RAISE EXCEPTION 'trips.view permission required' USING ERRCODE = '42501';
  END IF;
  IF v_username = '' THEN RETURN NULL; END IF;

  SELECT p.id INTO v_creator_id
  FROM public.profiles p
  WHERE lower(p.username) = v_username
  ORDER BY p.id
  LIMIT 1;

  RETURN v_creator_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_find_trip_creator(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_find_trip_creator(text) TO authenticated;