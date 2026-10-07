CREATE OR REPLACE FUNCTION public.admin_get_existing_activity_analytics(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Invalid analytics date range';
  END IF;

  RETURN jsonb_build_object(
    'join_requests', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', days.day::date, 'count', coalesce(daily.total, 0)) ORDER BY days.day)
      FROM generate_series(p_start_date, p_end_date, interval '1 day') AS days(day)
      LEFT JOIN (
        SELECT created_at::date AS day, count(*)::bigint AS total
        FROM public.join_requests
        WHERE created_at >= p_start_date
          AND created_at < p_end_date + 1
        GROUP BY created_at::date
      ) AS daily ON daily.day = days.day::date
    ), '[]'::jsonb),
    'messages_sent', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', days.day::date, 'count', coalesce(daily.total, 0)) ORDER BY days.day)
      FROM generate_series(p_start_date, p_end_date, interval '1 day') AS days(day)
      LEFT JOIN (
        SELECT created_at::date AS day, count(*)::bigint AS total
        FROM public.messages
        WHERE created_at >= p_start_date
          AND created_at < p_end_date + 1
          AND coalesce(type, 'user') = 'user'
        GROUP BY created_at::date
      ) AS daily ON daily.day = days.day::date
    ), '[]'::jsonb),
    'session_duration', coalesce((
      SELECT jsonb_agg(jsonb_build_object('date', daily.date, 'seconds', daily.total) ORDER BY daily.date)
      FROM (
        SELECT date, sum(coalesce(total_session_duration, 0))::bigint AS total
        FROM public.user_engagement
        WHERE date >= p_start_date AND date <= p_end_date
        GROUP BY date
      ) AS daily
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_existing_activity_analytics(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_existing_activity_analytics(date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';