-- Create a generic increment function used by acceptTripInvite and approveJoinRequest
-- to atomically increment current_participants (or any integer column) on any table.
CREATE OR REPLACE FUNCTION public.increment(
  table_name text,
  row_id uuid,
  column_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE public.%I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
    table_name,
    column_name,
    column_name
  ) USING row_id;
END;
$$;
