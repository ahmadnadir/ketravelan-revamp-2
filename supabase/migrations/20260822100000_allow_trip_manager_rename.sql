-- Allow trip creators and active co-hosts to rename a trip without granting
-- them broad UPDATE access to every trips column.

CREATE OR REPLACE FUNCTION public.rename_trip(
  p_trip_id uuid,
  p_title text
)
RETURNS TABLE(id uuid, title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_title text := trim(p_title);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF normalized_title IS NULL OR char_length(normalized_title) < 3 OR char_length(normalized_title) > 80 THEN
    RAISE EXCEPTION 'Trip name must be between 3 and 80 characters' USING ERRCODE = '22023';
  END IF;

  IF NOT public.is_trip_manager(p_trip_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the trip host or co-host can update the trip name' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE public.trips
  SET title = normalized_title
  WHERE trips.id = p_trip_id
  RETURNING trips.id, trips.title;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_trip(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_trip(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
