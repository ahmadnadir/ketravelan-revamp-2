Implement a global Offline State for the Ketravelan app.

Requirements:
- Detect when device has no internet connection.
- Show a clear offline banner or screen instead of empty UI.
- Keep last cached data visible when possible.
- If data cannot be loaded, show a friendly "No Internet Connection" screen.
- Provide a Retry button to attempt fetching data again.
- Automatically refresh data when connection is restored.

UI should be modern and clean similar to Airbnb / Instagram offline handling.

Do not show empty states or broken UI when network is unavailable.-- Fix double-increment appearance when approving the first join request.
--
-- Root cause: the COUNT-based approve_join_request RPC was counting the trip
-- organizer (role = 'organizer') together with regular members, but
-- current_participants is initialised to 0 at trip creation (organizer not
-- counted). This caused the first approval to jump from 0 → 2 instead of 0 → 1.
--
-- Fix: exclude role = 'organizer' rows from the member count so the RPC stays
-- consistent with every other path that writes current_participants (acceptTripInvite,
-- etc.), all of which ignore the organizer.
--
-- Also runs a one-time data correction so existing trips that were over-counted
-- are brought back to the true non-organizer member count.

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

  -- Count only non-organizer members so the value stays consistent with
  -- current_participants = 0 at trip creation (organizer does not occupy a slot).
  SELECT COUNT(*)
  INTO v_member_count
  FROM public.trip_members
  WHERE trip_id = v_trip_id
    AND left_at IS NULL
    AND role != 'organizer';

  UPDATE public.trips
  SET current_participants = v_member_count
  WHERE id = v_trip_id;

  RETURN QUERY SELECT v_trip_id AS approved_trip_id, v_user_id AS approved_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- One-time data correction
-- Recalculate current_participants for all trips using the same non-organizer
-- count so any trips where the organizer was previously counted are fixed.
-- -------------------------------------------------------------------------
UPDATE public.trips t
SET current_participants = (
  SELECT COUNT(*)
  FROM public.trip_members tm
  WHERE tm.trip_id = t.id
    AND tm.left_at IS NULL
    AND tm.role != 'organizer'
);

NOTIFY pgrst, 'reload schema';
