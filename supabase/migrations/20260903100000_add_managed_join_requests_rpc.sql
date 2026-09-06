-- Return only requests for trips the current user actively manages.
CREATE OR REPLACE FUNCTION public.get_managed_join_requests()
RETURNS SETOF public.join_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jr.*
  FROM public.join_requests jr
  WHERE auth.uid() IS NOT NULL
    AND public.is_trip_manager(jr.trip_id, auth.uid())
  ORDER BY jr.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_managed_join_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_managed_join_requests() TO authenticated;
NOTIFY pgrst, 'reload schema';
