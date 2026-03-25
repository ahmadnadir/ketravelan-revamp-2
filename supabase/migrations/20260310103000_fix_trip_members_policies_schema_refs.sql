-- Fix trip_members RLS policies that reference trips without schema qualification.

DROP POLICY IF EXISTS "System can add trip members" ON public.trip_members;
DROP POLICY IF EXISTS "Users can view trip members" ON public.trip_members;
DROP POLICY IF EXISTS "Admins can update trip members" ON public.trip_members;
DROP POLICY IF EXISTS "Users can leave trips" ON public.trip_members;

CREATE POLICY "System can add trip members"
  ON public.trip_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view trip members"
  ON public.trip_members
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM public.trips WHERE status = 'published'
    )
    OR trip_id IN (
      SELECT id FROM public.trips WHERE creator_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update trip members"
  ON public.trip_members
  FOR UPDATE
  TO authenticated
  USING (
    trip_id IN (
      SELECT tm.trip_id
      FROM public.trip_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.is_admin = true
      AND tm.left_at IS NULL
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT tm.trip_id
      FROM public.trip_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.is_admin = true
      AND tm.left_at IS NULL
    )
  );

CREATE POLICY "Users can leave trips"
  ON public.trip_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
