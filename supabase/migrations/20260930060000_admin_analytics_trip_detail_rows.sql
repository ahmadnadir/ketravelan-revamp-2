CREATE OR REPLACE FUNCTION public.admin_get_analytics_trip_detail_rows(
  p_metric text,
  p_start_date date,
  p_end_date date,
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
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_page_size integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;
  IF p_metric NOT IN ('trip-views', 'join-requests') THEN
    RAISE EXCEPTION 'Unsupported trip analytics metric';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;

  WITH trip_ids AS (
    SELECT trip_id FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date
    UNION
    SELECT CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (event_data->>'trip_id')::uuid END
    FROM public.analytics_events
    WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      AND event_name IN ('trip_view', 'trip_join_request')
    UNION
    SELECT trip_id FROM public.join_requests WHERE created_at >= p_start_date AND created_at < p_end_date + 1
  ), details AS (
    SELECT ti.trip_id::text AS trip_id, coalesce(t.title, 'Deleted trip') AS trip,
      coalesce(ta.views, 0)::bigint AS trip_analytics_views,
      coalesce(ev.views, 0)::bigint AS trip_view_events,
      greatest(coalesce(ta.views, 0), coalesce(ev.views, 0))::bigint AS counted_views,
      coalesce(ta.join_requests, 0)::bigint AS trip_analytics_requests,
      coalesce(ev.join_requests, 0)::bigint AS join_request_events,
      coalesce(jr.requests, 0)::bigint AS join_request_records,
      greatest(coalesce(ta.join_requests, 0), coalesce(ev.join_requests, 0), coalesce(jr.requests, 0))::bigint AS counted_requests
    FROM trip_ids ti
    LEFT JOIN public.trips t ON t.id = ti.trip_id
    LEFT JOIN (
      SELECT trip_id, sum(coalesce(views, 0)) AS views, sum(coalesce(join_requests, 0)) AS join_requests
      FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date GROUP BY trip_id
    ) ta ON ta.trip_id = ti.trip_id
    LEFT JOIN (
      SELECT CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (event_data->>'trip_id')::uuid END AS trip_id,
        count(*) FILTER (WHERE event_name = 'trip_view') AS views,
        count(*) FILTER (WHERE event_name = 'trip_join_request') AS join_requests
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
        AND event_name IN ('trip_view', 'trip_join_request')
      GROUP BY CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (event_data->>'trip_id')::uuid END
    ) ev ON ev.trip_id = ti.trip_id
    LEFT JOIN (
      SELECT trip_id, count(*) AS requests FROM public.join_requests
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 GROUP BY trip_id
    ) jr ON jr.trip_id = ti.trip_id
  )
  SELECT count(*) INTO v_total FROM details
  WHERE (p_metric = 'trip-views' AND trip_analytics_views + trip_view_events > 0)
     OR (p_metric = 'join-requests' AND trip_analytics_requests + join_request_events + join_request_records > 0);

  WITH trip_ids AS (
    SELECT trip_id FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date
    UNION
    SELECT CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (event_data->>'trip_id')::uuid END
    FROM public.analytics_events
    WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      AND event_name IN ('trip_view', 'trip_join_request')
    UNION
    SELECT trip_id FROM public.join_requests WHERE created_at >= p_start_date AND created_at < p_end_date + 1
  ), details AS (
    SELECT ti.trip_id::text AS trip_id, coalesce(t.title, 'Deleted trip') AS trip,
      coalesce(ta.views, 0)::bigint AS trip_analytics_views,
      coalesce(ev.views, 0)::bigint AS trip_view_events,
      greatest(coalesce(ta.views, 0), coalesce(ev.views, 0))::bigint AS counted_views,
      coalesce(ta.join_requests, 0)::bigint AS trip_analytics_requests,
      coalesce(ev.join_requests, 0)::bigint AS join_request_events,
      coalesce(jr.requests, 0)::bigint AS join_request_records,
      greatest(coalesce(ta.join_requests, 0), coalesce(ev.join_requests, 0), coalesce(jr.requests, 0))::bigint AS counted_requests
    FROM trip_ids ti LEFT JOIN public.trips t ON t.id = ti.trip_id
    LEFT JOIN (
      SELECT trip_id, sum(coalesce(views, 0)) AS views, sum(coalesce(join_requests, 0)) AS join_requests
      FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date GROUP BY trip_id
    ) ta ON ta.trip_id = ti.trip_id
    LEFT JOIN (
      SELECT CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (event_data->>'trip_id')::uuid END AS trip_id,
        count(*) FILTER (WHERE event_name = 'trip_view') AS views,
        count(*) FILTER (WHERE event_name = 'trip_join_request') AS join_requests
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
        AND event_name IN ('trip_view', 'trip_join_request')
      GROUP BY CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (event_data->>'trip_id')::uuid END
    ) ev ON ev.trip_id = ti.trip_id
    LEFT JOIN (
      SELECT trip_id, count(*) AS requests FROM public.join_requests
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 GROUP BY trip_id
    ) jr ON jr.trip_id = ti.trip_id
  )
  SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT * FROM details
    WHERE (p_metric = 'trip-views' AND trip_analytics_views + trip_view_events > 0)
       OR (p_metric = 'join-requests' AND trip_analytics_requests + join_request_events + join_request_records > 0)
    ORDER BY CASE WHEN p_metric = 'trip-views' THEN counted_views ELSE counted_requests END DESC, trip
    OFFSET v_offset LIMIT v_page_size
  ) page;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_analytics_trip_detail_rows(text, date, date, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_trip_detail_rows(text, date, date, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';