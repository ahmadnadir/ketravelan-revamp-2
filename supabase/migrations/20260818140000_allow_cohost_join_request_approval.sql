-- Allow trip co-hosts (admin trip members) to approve join requests, keep the
-- approval idempotent, and notify the other managers of the trip.

CREATE OR REPLACE FUNCTION public.is_trip_manager(p_trip_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = p_trip_id AND t.creator_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = p_user_id
      AND tm.left_at IS NULL
      AND (tm.is_admin = true OR lower(coalesce(tm.role, '')) IN ('organizer', 'co-host', 'cohost', 'admin', 'host'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_trip_manager(uuid, uuid) TO authenticated;

-- Managers must be able to read the requests they are allowed to action.
DROP POLICY IF EXISTS "Trip managers can view join requests" ON public.join_requests;
CREATE POLICY "Trip managers can view join requests"
  ON public.join_requests FOR SELECT
  TO authenticated
  USING (public.is_trip_manager(join_requests.trip_id, auth.uid()));

DROP POLICY IF EXISTS "Trip managers can update join requests" ON public.join_requests;
CREATE POLICY "Trip managers can update join requests"
  ON public.join_requests FOR UPDATE
  TO authenticated
  USING (public.is_trip_manager(join_requests.trip_id, auth.uid()))
  WITH CHECK (public.is_trip_manager(join_requests.trip_id, auth.uid()));

-- Return type changes, so the old function has to go first.
DROP FUNCTION IF EXISTS public.approve_join_request(uuid);

CREATE FUNCTION public.approve_join_request(request_id uuid)
RETURNS TABLE(trip_id uuid, user_id uuid, approved boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status join_request_status;
  v_trip_title text;
  v_approver_name text;
  v_requester_name text;
  v_inserted_count integer := 0;
  v_manager record;
BEGIN
  SELECT jr.trip_id, jr.user_id, jr.status, t.title
  INTO trip_id, user_id, v_status, v_trip_title
  FROM public.join_requests jr
  JOIN public.trips t ON t.id = jr.trip_id
  WHERE jr.id = request_id
  FOR UPDATE OF jr;

  IF trip_id IS NULL THEN
    RAISE EXCEPTION 'Join request not found' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT public.is_trip_manager(trip_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed to approve this request' USING ERRCODE = '42501';
  END IF;

  -- Already handled by another host/co-host: no second approval, no second notification.
  IF v_status IS DISTINCT FROM 'pending'::join_request_status THEN
    approved := false;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.join_requests
  SET status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    approved := false;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (trip_id, user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    UPDATE public.trips
    SET current_participants = COALESCE(current_participants, 0) + 1
    WHERE id = trip_id;
  END IF;

  SELECT coalesce(p.full_name, p.username, 'A trip manager')
  INTO v_approver_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  SELECT coalesce(p.full_name, p.username, 'A traveller')
  INTO v_requester_name
  FROM public.profiles p
  WHERE p.id = user_id;

  FOR v_manager IN
    SELECT DISTINCT m.id AS manager_id
    FROM (
      SELECT t.creator_id AS id FROM public.trips t WHERE t.id = trip_id
      UNION
      SELECT tm.user_id AS id
      FROM public.trip_members tm
      WHERE tm.trip_id = trip_id
        AND tm.left_at IS NULL
        AND (tm.is_admin = true OR lower(coalesce(tm.role, '')) IN ('organizer', 'co-host', 'cohost', 'admin', 'host'))
    ) m
    WHERE m.id IS NOT NULL
      AND m.id <> auth.uid()
      AND m.id <> user_id
  LOOP
    PERFORM public.send_notification(
      p_user_id => v_manager.manager_id,
      p_type => 'member_joined',
      p_title => 'Join request approved',
      p_message => format('%s approved %s''s request to join %s', v_approver_name, v_requester_name, coalesce(v_trip_title, 'the trip')),
      p_action_url => format('/trip/%s', trip_id),
      p_metadata => jsonb_build_object(
        'trip_id', trip_id,
        'join_request_id', request_id,
        'approved_user_id', user_id,
        'approved_by', auth.uid()
      )
    );
  END LOOP;

  approved := true;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;
