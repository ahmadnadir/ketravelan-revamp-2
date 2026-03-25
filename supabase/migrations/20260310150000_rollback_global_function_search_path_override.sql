-- Roll back accidental global function search_path override.
-- This only targets functions in public schema that were set to:
--   search_path=public, extensions, pg_temp
-- and resets them to their prior default (no per-function override).

DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg = 'search_path=public, extensions, pg_temp'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) RESET search_path',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
