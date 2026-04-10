/*
  # Hotfix: guided capacity tracking + automatic slot reservation after successful payment

  - Adds guided_trips.current_participants for aggregate capacity visibility.
  - Adds guided_bookings.slots_reserved_at to make seat reservation idempotent.
  - Keeps guided_trips.current_participants synchronized from departure booked_pax.
  - Reserves departure slots automatically when a payment record is marked completed.
*/

ALTER TABLE public.guided_trips
  ADD COLUMN IF NOT EXISTS current_participants integer NOT NULL DEFAULT 0
  CHECK (current_participants >= 0);

ALTER TABLE public.guided_bookings
  ADD COLUMN IF NOT EXISTS slots_reserved_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_guided_trip_current_participants(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_trip_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.guided_trips gt
  SET current_participants = COALESCE(s.total_booked, 0)
  FROM (
    SELECT d.trip_id, COALESCE(SUM(d.booked_pax), 0)::integer AS total_booked
    FROM public.guided_trip_departure_dates d
    WHERE d.trip_id = p_trip_id
    GROUP BY d.trip_id
  ) s
  WHERE gt.id = p_trip_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.guided_trip_departure_dates d
    WHERE d.trip_id = p_trip_id
  ) THEN
    UPDATE public.guided_trips
    SET current_participants = 0
    WHERE id = p_trip_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_guided_trip_current_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sync_guided_trip_current_participants(NEW.trip_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.sync_guided_trip_current_participants(NEW.trip_id);
    IF OLD.trip_id IS DISTINCT FROM NEW.trip_id THEN
      PERFORM public.sync_guided_trip_current_participants(OLD.trip_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.sync_guided_trip_current_participants(OLD.trip_id);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_guided_trip_current_participants ON public.guided_trip_departure_dates;
CREATE TRIGGER trg_sync_guided_trip_current_participants
AFTER INSERT OR UPDATE OR DELETE ON public.guided_trip_departure_dates
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_guided_trip_current_participants();

UPDATE public.guided_trips gt
SET current_participants = COALESCE(s.total_booked, 0)
FROM (
  SELECT d.trip_id, COALESCE(SUM(d.booked_pax), 0)::integer AS total_booked
  FROM public.guided_trip_departure_dates d
  GROUP BY d.trip_id
) s
WHERE gt.id = s.trip_id;

UPDATE public.guided_trips
SET current_participants = 0
WHERE id NOT IN (
  SELECT DISTINCT d.trip_id
  FROM public.guided_trip_departure_dates d
);

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

  IF v_booking.slots_reserved_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.guided_book_departure(v_booking.departure_id, v_booking.num_participants);

  UPDATE public.guided_bookings
  SET slots_reserved_at = now(),
      confirmed_at = COALESCE(confirmed_at, now()),
      updated_at = now()
  WHERE id = v_booking.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reserve_guided_slots_on_payment_completed ON public.guided_payment_records;
CREATE TRIGGER trg_reserve_guided_slots_on_payment_completed
AFTER UPDATE OF payment_status ON public.guided_payment_records
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed')
EXECUTE FUNCTION public.reserve_guided_departure_slots_for_paid_booking();

NOTIFY pgrst, 'reload schema';
