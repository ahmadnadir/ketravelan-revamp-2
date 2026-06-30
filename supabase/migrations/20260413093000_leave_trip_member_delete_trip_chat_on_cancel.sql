-- Ensure trip group chat is removed when the last organizer leaves/cancels a trip.

DROP FUNCTION IF EXISTS public.leave_trip_member(boolean, uuid);

CREATE OR REPLACE FUNCTION public.leave_trip_member(
  p_force_cancel boolean DEFAULT false,
  p_trip_id uuid DEFAULT NULL
)
RETURNS TABLE(
  did_leave boolean,
  did_cancel_trip boolean,
  trip_already_cancelled boolean,
  organizers_before_leave integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_status text;
  v_is_admin boolean := false;
  v_organizer_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF p_trip_id IS NULL THEN
    RAISE EXCEPTION 'Trip id is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT t.status::text
  INTO v_trip_status
  FROM public.trips t
  WHERE t.id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.trip_members tm
  WHERE tm.trip_id = p_trip_id
    AND tm.left_at IS NULL
  FOR UPDATE;

  SELECT tm.is_admin
  INTO v_is_admin
  FROM public.trip_members tm
  WHERE tm.trip_id = p_trip_id
    AND tm.user_id = v_user_id
    AND tm.left_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not an active member of this trip'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_organizer_count
  FROM public.trip_members tm
  WHERE tm.trip_id = p_trip_id
    AND tm.is_admin = true
    AND tm.left_at IS NULL;

  UPDATE public.trip_members
  SET left_at = now()
  WHERE trip_id = p_trip_id
    AND user_id = v_user_id
    AND left_at IS NULL;

  did_leave := FOUND;
  did_cancel_trip := false;
  trip_already_cancelled := (v_trip_status = 'cancelled');
  organizers_before_leave := v_organizer_count;

  IF did_leave AND v_is_admin AND v_organizer_count = 1 THEN
    IF v_trip_status <> 'cancelled' THEN
      UPDATE public.trips
      SET status = 'cancelled'
      WHERE id = p_trip_id;

      did_cancel_trip := true;
    END IF;

    -- Remove trip group chat when last organizer leaves/cancels.
    DELETE FROM public.conversations
    WHERE trip_id = p_trip_id
      AND conversation_type = 'trip_group';
  END IF;

  PERFORM p_force_cancel;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_trip_member(boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_trip_member(boolean, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
