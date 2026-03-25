-- Remove the COUNT-based current_participants update from approve_join_request.
-- The client now handles a clean +1 increment per approval (see trips.ts).
-- This avoids the race where COUNT returns stale data inside the same transaction.

DROP FUNCTION IF EXISTS public.approve_join_request(uuid);

CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
RETURNS TABLE(approved_trip_id uuid, approved_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id   uuid;
  v_user_id   uuid;
  v_creator_id uuid;
  v_status    text;
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
    status      = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at  = now()
  WHERE id = request_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (v_trip_id, v_user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- current_participants is incremented by +1 on the client side after this
  -- function returns, so we do NOT touch it here.

  RETURN QUERY SELECT v_trip_id AS approved_trip_id, v_user_id AS approved_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;
