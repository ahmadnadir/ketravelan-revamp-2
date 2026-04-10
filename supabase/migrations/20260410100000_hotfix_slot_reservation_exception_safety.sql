/*
  # Hotfix: Make slot-reservation trigger tolerant of capacity errors
  
  Previously, any exception raised inside reserve_guided_departure_slots_for_paid_booking()
  (e.g. "Insufficient capacity", "Departure not found", or a missing function) would roll
  back the UPDATE on guided_payment_records, preventing the payment from ever being
  recorded as completed.
  
  This patch wraps the guided_book_departure call in an EXCEPTION block so that
  slot-reservation failures are logged as WARNING notices but never abort the payment.
  A follow-up reconciliation job can catch the WARNING and handle retries.
*/
CREATE OR REPLACE FUNCTION public.reserve_guided_departure_slots_for_paid_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.guided_bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM public.guided_bookings
  WHERE id = NEW.booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Idempotency guard: already reserved, nothing to do.
  IF v_booking.slots_reserved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Reserve the departure slots. If this fails for any reason (capacity,
  -- missing departure, etc.) we log a warning and allow the payment record
  -- update to commit anyway.
  BEGIN
    PERFORM public.guided_book_departure(
      v_booking.departure_id,
      v_booking.num_participants
    );

    UPDATE public.guided_bookings
    SET slots_reserved_at = now(),
        confirmed_at      = COALESCE(confirmed_at, now()),
        updated_at        = now()
    WHERE id = v_booking.id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING
      'reserve_guided_departure_slots: could not reserve slots for booking % (departure %, pax %): %',
      v_booking.id,
      v_booking.departure_id,
      v_booking.num_participants,
      SQLERRM;
  END;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
