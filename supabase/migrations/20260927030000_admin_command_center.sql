-- Admin command-center summaries and permission-filtered global search.
-- Values are sourced from existing Ketravelan tables; currency amounts stay grouped.

DO $$
BEGIN
  IF to_regprocedure('public.admin_has_permission(text)') IS NULL THEN
    RAISE EXCEPTION 'Admin command center requires public.admin_has_permission(text)';
  END IF;
  IF to_regclass('public.profiles') IS NULL
    OR to_regclass('public.trips') IS NULL
    OR to_regclass('public.reports') IS NULL
    OR to_regclass('public.payments') IS NULL
    OR to_regclass('public.affiliate_commissions') IS NULL THEN
    RAISE EXCEPTION 'Admin command-center source tables are incomplete';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_command_center(p_trend_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_days integer := greatest(1, least(coalesce(p_trend_days, 30), 365));
  v_period_start date;
  v_previous_start date;
  v_moderation jsonb := NULL;
  v_transactions jsonb := NULL;
  v_affiliate jsonb := NULL;
  v_registration_trend jsonb;
BEGIN
  IF NOT public.admin_has_permission('analytics.view') THEN
    RAISE EXCEPTION 'Analytics access required' USING ERRCODE = '42501';
  END IF;

  v_period_start := current_date - (v_days - 1);
  v_previous_start := v_period_start - v_days;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'day', days.day::date,
    'new_users', coalesce(daily.new_users, 0)
  ) ORDER BY days.day), '[]'::jsonb)
  INTO v_registration_trend
  FROM generate_series(v_period_start, current_date, interval '1 day') AS days(day)
  LEFT JOIN (
    SELECT created_at::date AS day, count(*)::integer AS new_users
    FROM auth.users
    WHERE created_at >= v_period_start
      AND created_at < current_date + interval '1 day'
    GROUP BY created_at::date
  ) daily ON daily.day = days.day::date;

  IF public.admin_has_permission('moderation.view') THEN
    SELECT jsonb_build_object(
      'needs_review', count(*) FILTER (WHERE r.status::text = 'open'),
      'in_review', count(*) FILTER (WHERE r.status::text = 'under_review'),
      'open_total', count(*) FILTER (WHERE r.status::text IN ('open', 'under_review'))
    ) INTO v_moderation
    FROM public.reports r;
  END IF;

  IF public.admin_has_permission('transactions.view') THEN
    SELECT jsonb_build_object(
      'failed_payments', (SELECT count(*) FROM public.payments p WHERE p.status::text = 'failed'),
      'completed_mtd', coalesce((
        SELECT jsonb_agg(jsonb_build_object('currency', grouped.currency, 'records', grouped.records, 'amount', grouped.amount)
          ORDER BY grouped.currency)
        FROM (
          SELECT coalesce(p.currency, 'UNKNOWN') AS currency, count(*)::bigint AS records,
            coalesce(sum(p.amount), 0)::numeric AS amount
          FROM public.payments p
          WHERE p.status::text = 'completed'
            AND p.created_at >= date_trunc('month', now())
          GROUP BY coalesce(p.currency, 'UNKNOWN')
        ) grouped
      ), '[]'::jsonb)
    ) INTO v_transactions;
  END IF;

  IF public.admin_has_permission('affiliate.view') THEN
    SELECT jsonb_build_object(
      'clicks_mtd', (SELECT count(*) FROM public.affiliate_clicks c WHERE c.created_at >= date_trunc('month', now())),
      'conversions_today', (SELECT count(*) FROM public.affiliate_conversions c WHERE c.created_at >= current_date),
      'reconciliation_pending', (SELECT count(*) FROM public.affiliate_commissions c WHERE c.received_at IS NOT NULL AND c.reconciled_at IS NULL),
      'received_mtd', coalesce((
        SELECT jsonb_agg(jsonb_build_object('currency', grouped.currency, 'records', grouped.records, 'amount', grouped.amount)
          ORDER BY grouped.currency)
        FROM (
          SELECT c.currency, count(*)::bigint AS records, coalesce(sum(c.commission_amount), 0)::numeric AS amount
          FROM public.affiliate_commissions c
          WHERE c.received_at >= date_trunc('month', now())
          GROUP BY c.currency
        ) grouped
      ), '[]'::jsonb)
    ) INTO v_affiliate;
  END IF;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'trend_days', v_days,
    'users_total', (SELECT count(*) FROM public.profiles),
    'users_added_today', (SELECT count(*) FROM auth.users WHERE created_at >= current_date),
    'users_added_previous_period', (SELECT count(*) FROM auth.users WHERE created_at >= v_previous_start AND created_at < v_period_start),
    'trips_total', (SELECT count(*) FROM public.trips),
    'trips_published', (SELECT count(*) FROM public.trips WHERE status::text = 'published'),
    'registration_trend', v_registration_trend,
    'moderation', v_moderation,
    'transactions', v_transactions,
    'affiliate', v_affiliate
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_global_search(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
  v_results jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_query) < 2 THEN
    RETURN v_results;
  END IF;
  v_pattern := '%' || replace(replace(replace(v_query, chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%';

  IF public.admin_has_permission('users.view') THEN
    v_results := v_results || coalesce((
      SELECT jsonb_agg(result) FROM (
        SELECT jsonb_build_object('kind', 'User', 'title', coalesce(nullif(p.full_name, ''), p.username, 'Unnamed user'),
          'subtitle', coalesce(p.username, 'Profile'), 'path', '/admin/users/' || p.id) AS result
        FROM public.profiles p
        WHERE coalesce(p.full_name, '') ILIKE v_pattern ESCAPE chr(92) OR coalesce(p.username, '') ILIKE v_pattern ESCAPE chr(92)
        ORDER BY p.created_at DESC LIMIT 5
      ) matches
    ), '[]'::jsonb);
  END IF;

  IF public.admin_has_permission('trips.view') THEN
    v_results := v_results || coalesce((
      SELECT jsonb_agg(result) FROM (
        SELECT jsonb_build_object('kind', 'Trip', 'title', t.title,
          'subtitle', concat_ws(' · ', t.destination, initcap(t.status::text)), 'path', '/admin/trips/' || t.id) AS result
        FROM public.trips t
        WHERE t.title ILIKE v_pattern ESCAPE chr(92) OR coalesce(t.destination, '') ILIKE v_pattern ESCAPE chr(92)
        ORDER BY t.created_at DESC LIMIT 5
      ) matches
    ), '[]'::jsonb);
  END IF;

  IF public.admin_has_permission('moderation.view') THEN
    v_results := v_results || coalesce((
      SELECT jsonb_agg(result) FROM (
        SELECT jsonb_build_object('kind', 'Report', 'title', initcap(replace(r.content_type::text, '_', ' ')),
          'subtitle', concat_ws(' · ', initcap(replace(r.reason::text, '_', ' ')), initcap(replace(r.status::text, '_', ' '))),
          'path', '/admin/moderation/' || r.id) AS result
        FROM public.reports r
        WHERE r.reason::text ILIKE v_pattern ESCAPE chr(92) OR r.content_type::text ILIKE v_pattern ESCAPE chr(92) OR r.details ILIKE v_pattern ESCAPE chr(92)
        ORDER BY r.created_at DESC LIMIT 5
      ) matches
    ), '[]'::jsonb);
  END IF;

  IF public.admin_has_permission('transactions.view') THEN
    v_results := v_results || coalesce((
      SELECT jsonb_agg(result) FROM (
        SELECT jsonb_build_object('kind', 'Payment', 'title', 'Marketplace payment',
          'subtitle', concat_ws(' · ', initcap(coalesce(p.status::text, 'unknown')), coalesce(p.currency, 'Currency not recorded') || ' ' || to_char(p.amount, 'FM999999999990.00')),
          'path', '/admin/transactions/standard_payments') AS result
        FROM public.payments p
        WHERE coalesce(p.payment_method, '') ILIKE v_pattern ESCAPE chr(92) OR coalesce(p.status::text, '') ILIKE v_pattern ESCAPE chr(92)
        ORDER BY p.created_at DESC LIMIT 5
      ) matches
    ), '[]'::jsonb);
  END IF;

  IF public.admin_has_permission('affiliate.view') THEN
    v_results := v_results || coalesce((
      SELECT jsonb_agg(result) FROM (
        SELECT jsonb_build_object('kind', 'Affiliate link', 'title', l.code,
          'subtitle', concat_ws(' · ', ca.name, pr.name), 'path', '/admin/affiliate/links') AS result
        FROM public.affiliate_links l
        JOIN public.affiliate_campaigns ca ON ca.id = l.campaign_id
        JOIN public.affiliate_programs pg ON pg.id = ca.program_id
        JOIN public.affiliate_providers pr ON pr.id = pg.provider_id
        WHERE l.code ILIKE v_pattern ESCAPE chr(92) OR ca.name ILIKE v_pattern ESCAPE chr(92) OR pr.name ILIKE v_pattern ESCAPE chr(92)
        ORDER BY l.created_at DESC LIMIT 5
      ) matches
    ), '[]'::jsonb);
  END IF;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_command_center(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_command_center(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_global_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_global_search(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
