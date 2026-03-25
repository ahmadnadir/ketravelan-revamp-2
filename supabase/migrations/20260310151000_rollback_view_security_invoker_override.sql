-- Roll back manual `ALTER VIEW ... SET (security_invoker = true)` overrides.
-- Safe to run multiple times; skips views that do not exist.

DO $$
DECLARE
  v_name text;
  v_names text[] := ARRAY[
    'trip_financial_summary',
    'trip_performance_overview',
    'trip_feedback_with_users',
    'user_trips',
    'trip_expenses_detailed',
    'user_cancelled_trips',
    'agent_revenue',
    'platform_statistics',
    'unread_message_counts',
    'trip_photos_with_users',
    'review_statistics',
    'conversation_participants_detailed',
    'tip_analytics',
    'user_statistics',
    'trip_tip_summary',
    'user_trip_join_status',
    'active_trip_members',
    'trip_announcements_with_reactions',
    'notification_counts',
    'trip_details',
    'conversation_details',
    'user_inspirations_with_user'
  ];
BEGIN
  FOREACH v_name IN ARRAY v_names LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_name
        AND c.relkind = 'v'
    ) THEN
      EXECUTE format('ALTER VIEW public.%I RESET (security_invoker);', v_name);
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
