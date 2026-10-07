CREATE OR REPLACE FUNCTION public.admin_get_analytics_metric_context(
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
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;

  IF p_metric = 'unique-users' THEN
    WITH details AS (
      SELECT e.user_id::text AS user_id,
        coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Unknown user') AS username,
        count(*)::bigint AS events, min(e.created_at) AS first_seen, max(e.created_at) AS last_seen
      FROM public.analytics_events e
      LEFT JOIN public.profiles p ON p.id = e.user_id
      WHERE e.created_at >= p_start_date AND e.created_at < p_end_date + 1 AND e.user_id IS NOT NULL
      GROUP BY e.user_id, p.username, p.full_name
    )
    SELECT count(*) INTO v_total FROM details;
    WITH details AS (
      SELECT e.user_id::text AS user_id,
        coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Unknown user') AS username,
        count(*)::bigint AS events, min(e.created_at) AS first_seen, max(e.created_at) AS last_seen
      FROM public.analytics_events e
      LEFT JOIN public.profiles p ON p.id = e.user_id
      WHERE e.created_at >= p_start_date AND e.created_at < p_end_date + 1 AND e.user_id IS NOT NULL
      GROUP BY e.user_id, p.username, p.full_name
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (SELECT * FROM details ORDER BY events DESC, username OFFSET v_offset LIMIT v_page_size) page;

  ELSIF p_metric = 'unique-sessions' THEN
    WITH details AS (
      SELECT e.session_id, count(*)::bigint AS events, min(e.created_at) AS first_seen, max(e.created_at) AS last_seen,
        coalesce(string_agg(DISTINCT coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Unknown user'), ', ')
          FILTER (WHERE e.user_id IS NOT NULL), 'Anonymous') AS usernames
      FROM public.analytics_events e
      LEFT JOIN public.profiles p ON p.id = e.user_id
      WHERE e.created_at >= p_start_date AND e.created_at < p_end_date + 1 AND nullif(e.session_id, '') IS NOT NULL
      GROUP BY e.session_id
    )
    SELECT count(*) INTO v_total FROM details;
    WITH details AS (
      SELECT e.session_id, count(*)::bigint AS events, min(e.created_at) AS first_seen, max(e.created_at) AS last_seen,
        coalesce(string_agg(DISTINCT coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Unknown user'), ', ')
          FILTER (WHERE e.user_id IS NOT NULL), 'Anonymous') AS usernames
      FROM public.analytics_events e
      LEFT JOIN public.profiles p ON p.id = e.user_id
      WHERE e.created_at >= p_start_date AND e.created_at < p_end_date + 1 AND nullif(e.session_id, '') IS NOT NULL
      GROUP BY e.session_id
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (SELECT * FROM details ORDER BY events DESC, session_id OFFSET v_offset LIMIT v_page_size) page;

  ELSIF p_metric IN ('trip-views', 'join-requests') THEN
    WITH trip_ids AS (
      SELECT trip_id FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date
      UNION
      SELECT CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (event_data->>'trip_id')::uuid END FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
        AND event_name IN ('trip_view', 'trip_join_request')
        AND coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      UNION
      SELECT trip_id FROM public.join_requests WHERE created_at >= p_start_date AND created_at < p_end_date + 1
    ), trip_metrics AS (
      SELECT ti.trip_id, coalesce(t.title, 'Deleted trip') AS trip,
        coalesce(ta.views, 0)::bigint AS trip_analytics_views,
        coalesce(ev.views, 0)::bigint AS trip_view_events,
        coalesce(ta.join_requests, 0)::bigint AS trip_analytics_requests,
        coalesce(ev.join_requests, 0)::bigint AS join_request_events,
        coalesce(jr.requests, 0)::bigint AS join_request_records
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
          AND coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        GROUP BY CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (event_data->>'trip_id')::uuid END
      ) ev ON ev.trip_id = ti.trip_id
      LEFT JOIN (
        SELECT trip_id, count(*) AS requests FROM public.join_requests
        WHERE created_at >= p_start_date AND created_at < p_end_date + 1 GROUP BY trip_id
      ) jr ON jr.trip_id = ti.trip_id
    ), details AS (
      SELECT *, greatest(trip_analytics_views, trip_view_events) AS counted_views,
        greatest(trip_analytics_requests, join_request_events, join_request_records) AS counted_requests
      FROM trip_metrics
    )
    SELECT count(*) INTO v_total FROM details
    WHERE (p_metric = 'trip-views' AND trip_analytics_views + trip_view_events > 0)
       OR (p_metric = 'join-requests' AND trip_analytics_requests + join_request_events + join_request_records > 0);
    WITH trip_ids AS (
      SELECT trip_id FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date
      UNION
      SELECT CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (event_data->>'trip_id')::uuid END FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
        AND event_name IN ('trip_view', 'trip_join_request')
        AND coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      UNION
      SELECT trip_id FROM public.join_requests WHERE created_at >= p_start_date AND created_at < p_end_date + 1
    ), trip_metrics AS (
      SELECT ti.trip_id, coalesce(t.title, 'Deleted trip') AS trip,
        coalesce(ta.views, 0)::bigint AS trip_analytics_views,
        coalesce(ev.views, 0)::bigint AS trip_view_events,
        coalesce(ta.join_requests, 0)::bigint AS trip_analytics_requests,
        coalesce(ev.join_requests, 0)::bigint AS join_request_events,
        coalesce(jr.requests, 0)::bigint AS join_request_records
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
          AND coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        GROUP BY CASE WHEN coalesce(event_data->>'trip_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN (event_data->>'trip_id')::uuid END
      ) ev ON ev.trip_id = ti.trip_id
      LEFT JOIN (
        SELECT trip_id, count(*) AS requests FROM public.join_requests
        WHERE created_at >= p_start_date AND created_at < p_end_date + 1 GROUP BY trip_id
      ) jr ON jr.trip_id = ti.trip_id
    ), details AS (
      SELECT *, greatest(trip_analytics_views, trip_view_events) AS counted_views,
        greatest(trip_analytics_requests, join_request_events, join_request_records) AS counted_requests
      FROM trip_metrics
    )
      SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
      FROM (
        SELECT * FROM (
        SELECT trip_id::text AS trip_id, trip,
          trip_analytics_views, trip_view_events,
          0::bigint AS trip_analytics_requests, 0::bigint AS join_request_events,
          0::bigint AS join_request_records, counted_views, 0::bigint AS counted_requests
        FROM details WHERE p_metric = 'trip-views' AND trip_analytics_views + trip_view_events > 0
        UNION ALL
        SELECT trip_id::text, trip,
          0::bigint, 0::bigint,
          trip_analytics_requests, join_request_events, join_request_records,
          0::bigint, counted_requests
        FROM details WHERE p_metric = 'join-requests' AND trip_analytics_requests + join_request_events + join_request_records > 0
        ) combined
        ORDER BY greatest(counted_views, counted_requests) DESC, trip OFFSET v_offset LIMIT v_page_size
      ) page;

  ELSIF p_metric = 'session-minutes' THEN
    WITH details AS (
      SELECT ue.date, 'user_engagement'::text AS source, ue.user_id::text AS user_id,
        coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Unknown user') AS username,
        NULL::text AS session_id, sum(coalesce(ue.total_session_duration, 0))::bigint AS duration_seconds
      FROM public.user_engagement ue LEFT JOIN public.profiles p ON p.id = ue.user_id
      WHERE ue.date BETWEEN p_start_date AND p_end_date AND coalesce(ue.total_session_duration, 0) > 0
      GROUP BY ue.date, ue.user_id, p.username, p.full_name
      UNION ALL
      SELECT e.created_at::date, 'session_duration event', e.user_id::text,
        coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Anonymous'),
        e.session_id, sum(greatest(coalesce((e.event_data->>'duration_seconds')::numeric, 0), 0))::bigint
      FROM public.analytics_events e LEFT JOIN public.profiles p ON p.id = e.user_id
      WHERE e.created_at >= p_start_date AND e.created_at < p_end_date + 1 AND e.event_name = 'session_duration'
      GROUP BY e.created_at::date, e.user_id, p.username, p.full_name, e.session_id
    )
    SELECT count(*) INTO v_total FROM details;
    WITH details AS (
      SELECT ue.date, 'user_engagement'::text AS source, ue.user_id::text AS user_id,
        coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Unknown user') AS username,
        NULL::text AS session_id, sum(coalesce(ue.total_session_duration, 0))::bigint AS duration_seconds
      FROM public.user_engagement ue LEFT JOIN public.profiles p ON p.id = ue.user_id
      WHERE ue.date BETWEEN p_start_date AND p_end_date AND coalesce(ue.total_session_duration, 0) > 0
      GROUP BY ue.date, ue.user_id, p.username, p.full_name
      UNION ALL
      SELECT e.created_at::date, 'session_duration event', e.user_id::text,
        coalesce(nullif(p.username, ''), nullif(p.full_name, ''), 'Anonymous'),
        e.session_id, sum(greatest(coalesce((e.event_data->>'duration_seconds')::numeric, 0), 0))::bigint
      FROM public.analytics_events e LEFT JOIN public.profiles p ON p.id = e.user_id
      WHERE e.created_at >= p_start_date AND e.created_at < p_end_date + 1 AND e.event_name = 'session_duration'
      GROUP BY e.created_at::date, e.user_id, p.username, p.full_name, e.session_id
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (SELECT * FROM details ORDER BY date DESC, duration_seconds DESC OFFSET v_offset LIMIT v_page_size) page;
  ELSE
    RAISE EXCEPTION 'Unsupported analytics metric';
  END IF;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_analytics_day_messages(
  p_date date,
  p_limit integer DEFAULT 100,
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
  v_page_size integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;
  IF p_date IS NULL THEN RAISE EXCEPTION 'Message date is required'; END IF;

  SELECT count(*) INTO v_total FROM public.messages m
  WHERE m.created_at >= p_date AND m.created_at < p_date + 1 AND coalesce(m.type, 'user') = 'user';

  SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT m.id::text AS message_id, m.conversation_id::text AS conversation_id,
      m.created_at, m.content, coalesce(m.attachments, '[]'::jsonb) AS attachments,
      coalesce(nullif(sender.username, ''), nullif(sender.full_name, ''), 'Unknown sender') AS sender,
      coalesce(c.conversation_type, 'conversation') AS conversation_type,
      c.name AS conversation_name, c.trip_id::text AS trip_id,
      coalesce(t.title, 'Direct conversation') AS trip_title
    FROM public.messages m
    LEFT JOIN public.profiles sender ON sender.id = m.sender_id
    LEFT JOIN public.conversations c ON c.id = m.conversation_id
    LEFT JOIN public.trips t ON t.id = c.trip_id
    WHERE m.created_at >= p_date AND m.created_at < p_date + 1 AND coalesce(m.type, 'user') = 'user'
    ORDER BY m.conversation_id, m.created_at, m.id
    OFFSET v_offset LIMIT v_page_size
  ) page;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_analytics_metric_context(text, date, date, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_analytics_day_messages(date, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_metric_context(text, date, date, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_day_messages(date, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';