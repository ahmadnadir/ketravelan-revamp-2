-- Let either active trip manager atomically decline a pending join request.
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id uuid)
RETURNS TABLE(trip_id uuid, user_id uuid, rejected boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status join_request_status;
  v_trip_title text;
  v_reviewer_name text;
  v_requester_name text;
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
    RAISE EXCEPTION 'Not allowed to decline this request' USING ERRCODE = '42501';
  END IF;

  IF v_status IS DISTINCT FROM 'pending'::join_request_status THEN
    rejected := false;
    RETURN NEXT;
    RETURN;
  END IF;

  UPDATE public.join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    rejected := false;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT coalesce(p.full_name, p.username, 'A trip manager')
  INTO v_reviewer_name FROM public.profiles p WHERE p.id = auth.uid();

  SELECT coalesce(p.full_name, p.username, 'A traveller')
  INTO v_requester_name FROM public.profiles p WHERE p.id = user_id;

  FOR v_manager IN
    SELECT DISTINCT manager_id
    FROM (
      SELECT t.creator_id AS manager_id FROM public.trips t WHERE t.id = trip_id
      UNION
      SELECT tm.user_id FROM public.trip_members tm
      WHERE tm.trip_id = trip_id AND tm.left_at IS NULL
        AND (tm.is_admin = true OR lower(coalesce(tm.role, '')) IN ('organizer', 'co-host', 'cohost', 'admin', 'host'))
    ) managers
    WHERE manager_id IS NOT NULL AND manager_id <> auth.uid() AND manager_id <> user_id
  LOOP
    PERFORM public.send_notification(
      p_user_id => v_manager.manager_id,
      p_type => 'member_joined',
      p_title => 'Join request declined',
      p_message => format('%s declined %s''s request to join %s', v_reviewer_name, v_requester_name, coalesce(v_trip_title, 'the trip')),
      p_action_url => format('/trip/%s', trip_id),
      p_metadata => jsonb_build_object(
        'trip_id', trip_id,
        'join_request_id', request_id,
        'requested_user_id', user_id,
        'reviewed_by', auth.uid(),
        'status', 'rejected'
      )
    );
  END LOOP;

  rejected := true;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
