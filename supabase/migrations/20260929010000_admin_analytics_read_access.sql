DROP POLICY IF EXISTS admin_analytics_events_select ON public.analytics_events;
CREATE POLICY admin_analytics_events_select ON public.analytics_events
  FOR SELECT TO authenticated
  USING (public.admin_has_permission('analytics.view'));

DROP POLICY IF EXISTS admin_trip_analytics_select ON public.trip_analytics;
CREATE POLICY admin_trip_analytics_select ON public.trip_analytics
  FOR SELECT TO authenticated
  USING (public.admin_has_permission('analytics.view'));

DROP POLICY IF EXISTS admin_user_engagement_select ON public.user_engagement;
CREATE POLICY admin_user_engagement_select ON public.user_engagement
  FOR SELECT TO authenticated
  USING (public.admin_has_permission('analytics.view'));