/*
  # Hotfix: Confirm booking on first successful installment

  Business rule requested:
  - First installment payment is enough to set booking_status = confirmed.
  - payment_status remains partial until all installments are paid.
*/

CREATE OR REPLACE FUNCTION public.sync_guided_booking_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_all_paid boolean;
  v_any_paid boolean;
  v_new_payment_status public.guided_payment_status;
  v_new_booking_status public.guided_booking_status;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT
    COUNT(*) FILTER (WHERE payment_status = 'paid') = COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
  INTO v_all_paid, v_any_paid
  FROM public.guided_payment_schedules
  WHERE booking_id = v_booking_id;

  IF v_all_paid THEN
    v_new_payment_status := 'paid';
    v_new_booking_status := 'confirmed';
  ELSIF v_any_paid THEN
    v_new_payment_status := 'partial';
    v_new_booking_status := 'confirmed';
  ELSE
    v_new_payment_status := 'unpaid';
    v_new_booking_status := 'awaiting_payment';
  END IF;

  UPDATE public.guided_bookings
  SET
    payment_status = v_new_payment_status,
    booking_status = CASE
      WHEN booking_status IN ('cancelled', 'completed') THEN booking_status
      ELSE v_new_booking_status
    END,
    confirmed_at = CASE
      WHEN v_any_paid AND confirmed_at IS NULL THEN now()
      ELSE confirmed_at
    END,
    updated_at = now()
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

NOTIFY pgrst, 'reload schema';
