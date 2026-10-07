CREATE OR REPLACE FUNCTION public.admin_get_analytics_trip_request_details(
  p_trip_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_rows jsonb;
  v_total bigint;
  v_page_size integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;
  IF p_trip_id IS NULL THEN RAISE EXCEPTION 'Trip ID is required'; END IF;

  SELECT count(*) INTO v_total
  FROM public.join_requests jr
  WHERE jr.trip_id = p_trip_id;

  SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jr.id::text AS request_id,
      jr.user_id::text AS user_id,
      coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Unknown user') AS username,
      p.full_name,
      jr.status::text AS status,
      jr.message,
      jr.created_at,
      jr.reviewed_at
    FROM public.join_requests jr
    LEFT JOIN public.profiles p ON p.id = jr.user_id
    WHERE jr.trip_id = p_trip_id
    ORDER BY jr.created_at DESC, jr.id
    OFFSET v_offset LIMIT v_page_size
  ) page;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_analytics_trip_request_details(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_trip_request_details(uuid, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';