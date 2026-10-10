CREATE OR REPLACE FUNCTION public.admin_get_analytics_card_details()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_month_start date := date_trunc('month', current_date)::date;
  v_previous_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'users_added_today', (
      SELECT count(*) FROM auth.users WHERE created_at >= current_date
    ),
    'users_added_this_month', (
      SELECT count(*) FROM auth.users
      WHERE created_at >= v_month_start
        AND created_at < v_month_start + interval '1 month'
    ),
    'users_added_previous_month', (
      SELECT count(*) FROM auth.users
      WHERE created_at >= v_previous_month_start
        AND created_at < v_month_start
    ),
    'trips_draft', (
      SELECT count(*) FROM public.trips WHERE status::text = 'draft'
    ),
    'trips_published', (
      SELECT count(*) FROM public.trips WHERE status::text = 'published'
    ),
    'trips_private', (
      SELECT count(*) FROM public.trips WHERE visibility = 'private'
    ),
    'trips_public', (
      SELECT count(*) FROM public.trips WHERE visibility = 'public'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_analytics_card_details() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics_card_details() TO authenticated;