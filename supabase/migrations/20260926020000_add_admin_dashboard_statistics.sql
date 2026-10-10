CREATE OR REPLACE FUNCTION public.get_admin_dashboard_statistics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'user_register_trend', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'day', days.day::date,
            'new_users', coalesce(daily.new_users, 0)
          ) ORDER BY days.day
        ),
        '[]'::jsonb
      )
      FROM generate_series(
        current_date - 29,
        current_date,
        interval '1 day'
      ) AS days(day)
      LEFT JOIN (
        SELECT created_at::date AS day, count(*)::integer AS new_users
        FROM auth.users
        WHERE created_at >= current_date - interval '29 days'
          AND created_at < current_date + interval '1 day'
        GROUP BY created_at::date
      ) AS daily ON daily.day = days.day::date
    ),
    'user_home_country', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object('country', country, 'user_count', user_count)
          ORDER BY user_count DESC, country ASC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT p.country, count(*)::integer AS user_count
        FROM public.profiles AS p
        WHERE p.country IS NOT NULL
        GROUP BY p.country
      ) AS countries
    ),
    'user_destination', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object('destination', destination, 'trip_count', trip_count)
          ORDER BY trip_count DESC, destination ASC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT lower(trim(t.destination)) AS destination, count(*)::integer AS trip_count
        FROM public.trips AS t
        WHERE t.status = 'published'::public.trip_status
          AND nullif(trim(t.destination), '') IS NOT NULL
        GROUP BY lower(trim(t.destination))
      ) AS destinations
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_statistics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_statistics() TO authenticated;

NOTIFY pgrst, 'reload schema';
