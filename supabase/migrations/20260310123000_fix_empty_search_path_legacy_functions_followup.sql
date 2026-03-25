-- Follow-up patch for legacy functions that may still have an empty search_path.
-- This migration is safe to run even if prior fixes already executed.

DO $$
DECLARE
  fn RECORD;
  target_functions text[] := ARRAY[
    'add_trip_member_to_conversation',
    'add_member_to_conversation',
    'debug_trip_access',
    'ensure_trip_conversation',
    'ensure_trip_has_conversation',
    'fix_all_participant_counts',
    'get_trip_with_creator_email',
    'generate_unique_slug'
  ];
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (target_functions)
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
