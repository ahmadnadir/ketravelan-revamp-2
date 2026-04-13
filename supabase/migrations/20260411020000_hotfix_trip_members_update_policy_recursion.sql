/*
  # Hotfix: resolve infinite recursion in trip_members UPDATE policy

  Root cause:
  - Policy "Admins can update trip members" references public.trip_members in its USING/WITH CHECK.
  - On UPDATE against public.trip_members, this can recurse and raise:
      42P17: infinite recursion detected in policy for relation "trip_members"

  Fix:
  - Introduce SECURITY DEFINER helper `public.can_manage_trip_members(...)`.
  - Replace recursive UPDATE policy to call helper instead of subquery on trip_members.
  - Keep self-leave flow by adding a dedicated self UPDATE policy.
*/

CREATE OR REPLACE FUNCTION public.can_manage_trip_members(
  p_trip_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = p_trip_id
      AND t.creator_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = p_user_id
      AND tm.is_admin = true
      AND tm.left_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_trip_members(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_trip_members(uuid, uuid) TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Admins can update trip members" ON public.trip_members;
CREATE POLICY "Admins can update trip members"
  ON public.trip_members
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_trip_members(trip_id, auth.uid()))
  WITH CHECK (public.can_manage_trip_members(trip_id, auth.uid()));

DROP POLICY IF EXISTS "Users can update own trip member row" ON public.trip_members;
CREATE POLICY "Users can update own trip member row"
  ON public.trip_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
