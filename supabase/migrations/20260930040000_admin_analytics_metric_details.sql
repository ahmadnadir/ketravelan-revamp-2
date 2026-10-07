CREATE OR REPLACE FUNCTION public.admin_get_analytics_metric_details(
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

  IF p_metric = 'tracked-events' THEN
    WITH details AS (
      SELECT created_at::date AS date, coalesce(event_category, 'Other') AS category,
        coalesce(event_name, 'Unknown') AS event, count(*)::bigint AS count
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      GROUP BY created_at::date, coalesce(event_category, 'Other'), coalesce(event_name, 'Unknown')
    )
    SELECT count(*) INTO v_total FROM details;
    WITH details AS (
      SELECT created_at::date AS date, coalesce(event_category, 'Other') AS category,
        coalesce(event_name, 'Unknown') AS event, count(*)::bigint AS count
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      GROUP BY created_at::date, coalesce(event_category, 'Other'), coalesce(event_name, 'Unknown')
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (SELECT * FROM details ORDER BY date DESC, count DESC, category, event OFFSET v_offset LIMIT v_page_size) page;

  ELSIF p_metric = 'unique-users' THEN
    WITH details AS (
      SELECT user_id::text AS user_id, count(*)::bigint AS events,
        min(created_at) AS first_seen, max(created_at) AS last_seen
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND user_id IS NOT NULL
      GROUP BY user_id
    )
    SELECT count(*) INTO v_total FROM details;
    WITH details AS (
      SELECT user_id::text AS user_id, count(*)::bigint AS events,
        min(created_at) AS first_seen, max(created_at) AS last_seen
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND user_id IS NOT NULL
      GROUP BY user_id
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (SELECT * FROM details ORDER BY events DESC, user_id OFFSET v_offset LIMIT v_page_size) page;

  ELSIF p_metric = 'unique-sessions' THEN
    WITH details AS (
      SELECT session_id, count(*)::bigint AS events,
        min(created_at) AS first_seen, max(created_at) AS last_seen
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND nullif(session_id, '') IS NOT NULL
      GROUP BY session_id
    )
    SELECT count(*) INTO v_total FROM details;
    WITH details AS (
      SELECT session_id, count(*)::bigint AS events,
        min(created_at) AS first_seen, max(created_at) AS last_seen
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND nullif(session_id, '') IS NOT NULL
      GROUP BY session_id
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (SELECT * FROM details ORDER BY events DESC, session_id OFFSET v_offset LIMIT v_page_size) page;

  ELSIF p_metric IN ('trip-views', 'join-requests') THEN
    WITH days AS (
      SELECT day::date AS date FROM generate_series(p_start_date, p_end_date, interval '1 day') day
    ), stored AS (
      SELECT date, sum(coalesce(views, 0))::bigint AS views,
        sum(coalesce(join_requests, 0))::bigint AS join_requests
      FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date GROUP BY date
    ), event_counts AS (
      SELECT created_at::date AS date,
        count(*) FILTER (WHERE event_name = 'trip_view')::bigint AS views,
        count(*) FILTER (WHERE event_name = 'trip_join_request')::bigint AS join_requests
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      GROUP BY created_at::date
    ), request_counts AS (
      SELECT created_at::date AS date, count(*)::bigint AS join_requests
      FROM public.join_requests
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      GROUP BY created_at::date
    ), details AS (
      SELECT days.date, coalesce(stored.views, 0) AS trip_analytics,
        coalesce(event_counts.views, 0) AS trip_view_events,
        greatest(coalesce(stored.views, 0), coalesce(event_counts.views, 0)) AS trip_views,
        coalesce(stored.join_requests, 0) AS trip_analytics_requests,
        coalesce(event_counts.join_requests, 0) AS join_request_events,
        coalesce(request_counts.join_requests, 0) AS join_request_records,
        greatest(coalesce(stored.join_requests, 0), coalesce(event_counts.join_requests, 0), coalesce(request_counts.join_requests, 0)) AS counted_join_requests
      FROM days LEFT JOIN stored USING (date) LEFT JOIN event_counts USING (date) LEFT JOIN request_counts USING (date)
    )
    SELECT count(*) INTO v_total FROM details
    WHERE (p_metric = 'trip-views' AND trip_analytics + trip_view_events > 0)
       OR (p_metric = 'join-requests' AND trip_analytics_requests + join_request_events + join_request_records > 0);
    WITH days AS (
      SELECT day::date AS date FROM generate_series(p_start_date, p_end_date, interval '1 day') day
    ), stored AS (
      SELECT date, sum(coalesce(views, 0))::bigint AS views,
        sum(coalesce(join_requests, 0))::bigint AS join_requests
      FROM public.trip_analytics WHERE date BETWEEN p_start_date AND p_end_date GROUP BY date
    ), event_counts AS (
      SELECT created_at::date AS date,
        count(*) FILTER (WHERE event_name = 'trip_view')::bigint AS views,
        count(*) FILTER (WHERE event_name = 'trip_join_request')::bigint AS join_requests
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      GROUP BY created_at::date
    ), request_counts AS (
      SELECT created_at::date AS date, count(*)::bigint AS join_requests
      FROM public.join_requests
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1
      GROUP BY created_at::date
    ), details AS (
      SELECT days.date, coalesce(stored.views, 0) AS trip_analytics,
        coalesce(event_counts.views, 0) AS trip_view_events,
        greatest(coalesce(stored.views, 0), coalesce(event_counts.views, 0)) AS trip_views,
        coalesce(stored.join_requests, 0) AS trip_analytics_requests,
        coalesce(event_counts.join_requests, 0) AS join_request_events,
        coalesce(request_counts.join_requests, 0) AS join_request_records,
        greatest(coalesce(stored.join_requests, 0), coalesce(event_counts.join_requests, 0), coalesce(request_counts.join_requests, 0)) AS counted_join_requests
      FROM days LEFT JOIN stored USING (date) LEFT JOIN event_counts USING (date) LEFT JOIN request_counts USING (date)
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT date, trip_analytics AS source_primary, trip_view_events AS source_secondary,
        0::bigint AS source_tertiary, trip_views AS counted
      FROM details WHERE p_metric = 'trip-views' AND trip_analytics + trip_view_events > 0
      UNION ALL
      SELECT date, trip_analytics_requests, join_request_events, join_request_records, counted_join_requests
      FROM details WHERE p_metric = 'join-requests' AND trip_analytics_requests + join_request_events + join_request_records > 0
      ORDER BY date DESC OFFSET v_offset LIMIT v_page_size
    ) page;

  ELSIF p_metric = 'conversions' THEN
    WITH details AS (
      SELECT ta.date, ta.trip_id::text AS trip_id, coalesce(t.title, 'Deleted trip') AS trip,
        sum(coalesce(ta.conversions, 0))::bigint AS conversions
      FROM public.trip_analytics ta LEFT JOIN public.trips t ON t.id = ta.trip_id
      WHERE ta.date BETWEEN p_start_date AND p_end_date
      GROUP BY ta.date, ta.trip_id, t.title
      HAVING sum(coalesce(ta.conversions, 0)) > 0
    )
    SELECT count(*) INTO v_total FROM details;
    WITH details AS (
      SELECT ta.date, ta.trip_id::text AS trip_id, coalesce(t.title, 'Deleted trip') AS trip,
        sum(coalesce(ta.conversions, 0))::bigint AS conversions
      FROM public.trip_analytics ta LEFT JOIN public.trips t ON t.id = ta.trip_id
      WHERE ta.date BETWEEN p_start_date AND p_end_date
      GROUP BY ta.date, ta.trip_id, t.title
      HAVING sum(coalesce(ta.conversions, 0)) > 0
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (SELECT * FROM details ORDER BY date DESC, conversions DESC OFFSET v_offset LIMIT v_page_size) page;

  ELSIF p_metric IN ('messages-sent', 'session-minutes') THEN
    WITH days AS (
      SELECT day::date AS date FROM generate_series(p_start_date, p_end_date, interval '1 day') day
    ), messages AS (
      SELECT created_at::date AS date, count(*)::bigint AS count FROM public.messages
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND coalesce(type, 'user') = 'user' GROUP BY created_at::date
    ), message_events AS (
      SELECT created_at::date AS date, count(*)::bigint AS count FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND event_name = 'message_sent' GROUP BY created_at::date
    ), engagement AS (
      SELECT date, sum(coalesce(messages_sent, 0))::bigint AS messages,
        sum(coalesce(total_session_duration, 0))::bigint AS session_seconds
      FROM public.user_engagement WHERE date BETWEEN p_start_date AND p_end_date GROUP BY date
    ), session_events AS (
      SELECT created_at::date AS date, sum(greatest(coalesce((event_data->>'duration_seconds')::numeric, 0), 0))::bigint AS seconds
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND event_name = 'session_duration'
      GROUP BY created_at::date
    ), details AS (
      SELECT days.date,
        coalesce(messages.count, 0) AS message_records,
        coalesce(message_events.count, 0) AS message_events,
        coalesce(engagement.messages, 0) AS engagement_messages,
        greatest(coalesce(messages.count, 0), coalesce(message_events.count, 0), coalesce(engagement.messages, 0)) AS messages_sent,
        coalesce(engagement.session_seconds, 0) AS engagement_seconds,
        coalesce(session_events.seconds, 0) AS session_event_seconds,
        greatest(coalesce(engagement.session_seconds, 0), coalesce(session_events.seconds, 0)) AS session_seconds
      FROM days LEFT JOIN messages USING (date) LEFT JOIN message_events USING (date)
        LEFT JOIN engagement USING (date) LEFT JOIN session_events USING (date)
    )
    SELECT count(*) INTO v_total FROM details
    WHERE (p_metric = 'messages-sent' AND message_records + message_events + engagement_messages > 0)
       OR (p_metric = 'session-minutes' AND engagement_seconds + session_event_seconds > 0);
    WITH days AS (
      SELECT day::date AS date FROM generate_series(p_start_date, p_end_date, interval '1 day') day
    ), messages AS (
      SELECT created_at::date AS date, count(*)::bigint AS count FROM public.messages
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND coalesce(type, 'user') = 'user' GROUP BY created_at::date
    ), message_events AS (
      SELECT created_at::date AS date, count(*)::bigint AS count FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND event_name = 'message_sent' GROUP BY created_at::date
    ), engagement AS (
      SELECT date, sum(coalesce(messages_sent, 0))::bigint AS messages,
        sum(coalesce(total_session_duration, 0))::bigint AS session_seconds
      FROM public.user_engagement WHERE date BETWEEN p_start_date AND p_end_date GROUP BY date
    ), session_events AS (
      SELECT created_at::date AS date, sum(greatest(coalesce((event_data->>'duration_seconds')::numeric, 0), 0))::bigint AS seconds
      FROM public.analytics_events
      WHERE created_at >= p_start_date AND created_at < p_end_date + 1 AND event_name = 'session_duration'
      GROUP BY created_at::date
    ), details AS (
      SELECT days.date,
        coalesce(messages.count, 0) AS message_records,
        coalesce(message_events.count, 0) AS message_events,
        coalesce(engagement.messages, 0) AS engagement_messages,
        greatest(coalesce(messages.count, 0), coalesce(message_events.count, 0), coalesce(engagement.messages, 0)) AS messages_sent,
        coalesce(engagement.session_seconds, 0) AS engagement_seconds,
        coalesce(session_events.seconds, 0) AS session_event_seconds,
        greatest(coalesce(engagement.session_seconds, 0), coalesce(session_events.seconds, 0)) AS session_seconds
      FROM days LEFT JOIN messages USING (date) LEFT JOIN message_events USING (date)
        LEFT JOIN engagement USING (date) LEFT JOIN session_events USING (date)
    )
    SELECT coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) INTO v_rows
    FROM (
      SELECT date, message_records AS source_primary, message_events AS source_secondary,
        engagement_messages AS source_tertiary, messages_sent AS counted
      FROM details WHERE p_metric = 'messages-sent' AND message_records + message_events + engagement_messages > 0
      UNION ALL
      SELECT date, engagement_seconds, session_event_seconds, 0::bigint, session_seconds
      FROM details WHERE p_metric = 'session-minutes' AND engagement_seconds + session_event_seconds > 0
      ORDER BY date DESC OFFSET v_offset LIMIT v_page_size
    ) page;
  ELSE
    RAISE EXCEPTION 'Unsupported analytics metric';
  END IF;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_analytics_metric_details(text, date, date, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_metric_details(text, date, date, integer, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';