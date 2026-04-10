/*
  # Hotfix: Sync booking_status from payment schedule trigger

  Problem:
    sync_guided_booking_payment_status() updates guided_bookings.payment_status
    but never updates booking_status. The only code setting booking_status='confirmed'
    was the frontend confirmPayment(), which runs as the anon/authenticated user and
    is silently dropped when RLS doesn't match (PostgREST returns 0 rows, no error).

  Fix:
    Extend the trigger to also set booking_status:
      - All schedules paid  → booking_status = 'confirmed', payment_status = 'paid'
      - Any but not all paid → booking_status = 'awaiting_payment', payment_status = 'partial'
      - None paid           → booking_status = 'awaiting_payment', payment_status = 'unpaid'
      - Only if booking is not already cancelled/completed (don't reopen closed bookings)

  This runs SECURITY DEFINER so it bypasses RLS and always succeeds.
*/
CREATE OR REPLACE FUNCTION public.sync_guided_booking_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id  uuid;
  v_all_paid    boolean;
  v_any_paid    boolean;
  v_new_payment_status text;
  v_new_booking_status text;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT
    COUNT(*) FILTER (WHERE payment_status = 'paid') = COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
  INTO v_all_paid, v_any_paid
  FROM public.guided_payment_schedules
  WHERE booking_id = v_booking_id;

  -- Determine new statuses
  IF v_all_paid THEN
    v_new_payment_status := 'paid';
    v_new_booking_status  := 'confirmed';
  ELSIF v_any_paid THEN
    v_new_payment_status := 'partial';
    v_new_booking_status  := 'awaiting_payment';
  ELSE
    v_new_payment_status := 'unpaid';
    v_new_booking_status  := 'awaiting_payment';
  END IF;

  -- Update booking; skip if already in a terminal state (cancelled / completed)
  UPDATE public.guided_bookings
  SET
    payment_status  = v_new_payment_status,
    booking_status  = CASE
                        WHEN booking_status IN ('cancelled', 'completed') THEN booking_status
                        ELSE v_new_booking_status
                      END,
    confirmed_at    = CASE
                        WHEN v_all_paid AND confirmed_at IS NULL THEN now()
                        ELSE confirmed_at
                      END,
    updated_at      = now()
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

NOTIFY pgrst, 'reload schema';
