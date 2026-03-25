-- Fix join-request approval failures caused by unqualified relation lookups.
-- Uses explicit public schema references and a fixed search_path.

-- Recreate join_requests policies with schema-qualified table references.
DROP POLICY IF EXISTS "Users can create join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Users can view own join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Trip creators can view join requests" ON public.join_requests;
DROP POLICY IF EXISTS "Trip creators can update join requests" ON public.join_requests;

CREATE POLICY "Users can create join requests"
  ON public.join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE public.trip_members.trip_id = public.join_requests.trip_id
      AND public.trip_members.user_id = auth.uid()
      AND public.trip_members.left_at IS NULL
    )
  );

CREATE POLICY "Users can view own join requests"
  ON public.join_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Trip creators can view join requests"
  ON public.join_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE public.trips.id = public.join_requests.trip_id
      AND public.trips.creator_id = auth.uid()
    )
  );

CREATE POLICY "Trip creators can update join requests"
  ON public.join_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE public.trips.id = public.join_requests.trip_id
      AND public.trips.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE public.trips.id = public.join_requests.trip_id
      AND public.trips.creator_id = auth.uid()
    )
  );

-- Recreate notification trigger function with explicit schema and fixed search_path.
CREATE OR REPLACE FUNCTION public.notify_trip_creator_on_join_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For updates, only notify when status transitions to pending.
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    related_trip_id,
    related_user_id,
    action_url
  )
  SELECT
    t.creator_id,
    'join_request',
    'New Join Request',
    COALESCE(p.full_name, p.username, 'Someone') || ' wants to join ' || t.title,
    NEW.trip_id,
    NEW.user_id,
    '/approvals'
  FROM public.trips t
  LEFT JOIN public.profiles p ON p.id = NEW.user_id
  WHERE t.id = NEW.trip_id;

  RETURN NEW;
END;
$$;
