-- Fix double-increment of current_participants when approving a join request.
-- The previous RPC used "+ 1" which caused over-counting when a DB trigger on
-- trip_members also increments the value. Replace with an absolute COUNT-based
-- recalculation so the result is always correct regardless of trigger setup.

DROP FUNCTION IF EXISTS public.approve_join_request(uuid);

CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
RETURNS TABLE(approved_trip_id uuid, approved_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_user_id uuid;
  v_creator_id uuid;
  v_status text;
  v_member_count integer;
BEGIN
  SELECT jr.trip_id, jr.user_id, t.creator_id, jr.status::text
  INTO v_trip_id, v_user_id, v_creator_id, v_status
  FROM public.join_requests jr
  JOIN public.trips t ON t.id = jr.trip_id
  WHERE jr.id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF v_creator_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed to approve this request' USING ERRCODE = '42501';
  END IF;

  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Join request already processed' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.join_requests
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = request_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Recalculate from actual active member count to avoid double-increment
  -- caused by any DB triggers that also modify current_participants.
  SELECT COUNT(*)
  INTO v_member_count
  FROM public.trip_members
  WHERE trip_id = v_trip_id
    AND left_at IS NULL;

  UPDATE public.trips
  SET current_participants = v_member_count
  WHERE id = v_trip_id;

  RETURN QUERY SELECT v_trip_id AS approved_trip_id, v_user_id AS approved_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
