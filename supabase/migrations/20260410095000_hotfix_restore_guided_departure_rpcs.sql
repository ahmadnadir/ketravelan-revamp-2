/*
  # Hotfix: Restore guided_book_departure and guided_cancel_departure_booking RPCs

  These functions were defined in the original schema migration but were not
  applied to the remote database. The slot-reservation trigger depends on
  guided_book_departure, causing "function does not exist" errors when a
  payment is confirmed.
*/

-- ============================================================
-- guided_book_departure
-- Atomically increments booked_pax on a departure row after
-- verifying capacity. Used by both the booking wizard and the
-- automatic slot-reservation trigger.
-- ============================================================
CREATE OR REPLACE FUNCTION public.guided_book_departure(
  p_departure_id uuid,
  p_requested_pax integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departure public.guided_trip_departure_dates%ROWTYPE;
BEGIN
  IF p_requested_pax IS NULL OR p_requested_pax <= 0 THEN
    RAISE EXCEPTION 'Requested pax must be greater than 0';
  END IF;

  SELECT * INTO v_departure
  FROM public.guided_trip_departure_dates
  WHERE id = p_departure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found';
  END IF;

  IF NOT v_departure.is_available THEN
    RAISE EXCEPTION 'Departure is no longer available';
  END IF;

  IF (v_departure.booked_pax + p_requested_pax) > v_departure.max_capacity THEN
    RAISE EXCEPTION 'Insufficient capacity';
  END IF;

  UPDATE public.guided_trip_departure_dates
  SET booked_pax = booked_pax + p_requested_pax,
      is_available = CASE
        WHEN (booked_pax + p_requested_pax) >= max_capacity THEN false
        ELSE is_available
      END,
      updated_at = now()
  WHERE id = p_departure_id
  RETURNING * INTO v_departure;

  RETURN jsonb_build_object(
    'departure_id', v_departure.id,
    'booked_pax', v_departure.booked_pax,
    'max_capacity', v_departure.max_capacity,
    'is_available', v_departure.is_available
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.guided_book_departure(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.guided_book_departure(uuid, integer) FROM anon;

-- ============================================================
-- guided_cancel_departure_booking
-- Atomically decrements booked_pax when a booking is cancelled.
-- ============================================================
CREATE OR REPLACE FUNCTION public.guided_cancel_departure_booking(
  p_departure_id uuid,
  p_pax_to_cancel integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departure public.guided_trip_departure_dates%ROWTYPE;
BEGIN
  IF p_pax_to_cancel IS NULL OR p_pax_to_cancel <= 0 THEN
    RAISE EXCEPTION 'Pax to cancel must be greater than 0';
  END IF;

  SELECT * INTO v_departure
  FROM public.guided_trip_departure_dates
  WHERE id = p_departure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found';
  END IF;

  UPDATE public.guided_trip_departure_dates
  SET booked_pax = GREATEST(booked_pax - p_pax_to_cancel, 0),
      is_available = true,
      updated_at = now()
  WHERE id = p_departure_id
  RETURNING * INTO v_departure;

  RETURN jsonb_build_object(
    'departure_id', v_departure.id,
    'booked_pax', v_departure.booked_pax,
    'max_capacity', v_departure.max_capacity,
    'is_available', v_departure.is_available
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.guided_cancel_departure_booking(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.guided_cancel_departure_booking(uuid, integer) FROM anon;

NOTIFY pgrst, 'reload schema';
