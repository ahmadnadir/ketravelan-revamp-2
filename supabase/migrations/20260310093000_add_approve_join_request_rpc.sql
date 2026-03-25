-- Approve join requests through a SECURITY DEFINER RPC with explicit public schema
-- references to avoid search_path-related relation lookup issues.
DROP FUNCTION IF EXISTS public.approve_join_request(uuid);

CREATE OR REPLACE FUNCTION public.approve_join_request(request_id uuid)
RETURNS TABLE(trip_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_status join_request_status;
  v_inserted_count integer := 0;
BEGIN
  SELECT jr.trip_id, jr.user_id, t.creator_id, jr.status
  INTO trip_id, user_id, v_creator_id, v_status
  FROM public.join_requests jr
  JOIN public.trips t ON t.id = jr.trip_id
  WHERE jr.id = request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF v_creator_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed to approve this request'
      USING ERRCODE = '42501';
  END IF;

  IF v_status IS DISTINCT FROM 'pending'::join_request_status THEN
    RAISE EXCEPTION 'Join request already processed'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.join_requests
  SET
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = request_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (trip_id, user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    UPDATE public.trips
    SET current_participants = COALESCE(current_participants, 0) + 1
    WHERE id = trip_id;
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;
