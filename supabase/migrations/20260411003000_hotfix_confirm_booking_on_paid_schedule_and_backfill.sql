/*
  # Hotfix: Ensure first paid installment always confirms booking + backfill existing rows

  Problem observed:
  - Some bookings remain `awaiting_payment` even after first installment is paid.

  Fix:
  1) Harden payment-record trigger to also update booking status directly after marking
     schedule paid.
  2) Backfill existing bookings using paid schedules / completed payment records.
*/

CREATE OR REPLACE FUNCTION public.sync_guided_schedule_from_payment_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
  v_all_paid boolean;
  v_any_paid boolean;
BEGIN
  IF NEW.payment_status <> 'completed'::public.guided_record_payment_status THEN
    RETURN NEW;
  END IF;

  v_schedule_id := NEW.payment_schedule_id;

  IF v_schedule_id IS NULL THEN
    SELECT gps.id
    INTO v_schedule_id
    FROM public.guided_payment_schedules gps
    WHERE gps.booking_id = NEW.booking_id
      AND gps.payment_status = 'pending'::public.guided_schedule_payment_status
    ORDER BY gps.installment_number
    LIMIT 1;
  END IF;

  IF v_schedule_id IS NOT NULL THEN
    UPDATE public.guided_payment_schedules
    SET payment_status = 'paid'::public.guided_schedule_payment_status,
        paid_at = COALESCE(NEW.paid_at, now()),
        payment_method = COALESCE(payment_method, 'card'),
        transaction_reference = COALESCE(NEW.transaction_reference, transaction_reference)
    WHERE id = v_schedule_id;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE payment_status = 'paid'::public.guided_schedule_payment_status) = COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid'::public.guided_schedule_payment_status) > 0
  INTO v_all_paid, v_any_paid
  FROM public.guided_payment_schedules
  WHERE booking_id = NEW.booking_id;

  UPDATE public.guided_bookings gb
  SET booking_status = CASE
                         WHEN gb.booking_status IN ('cancelled', 'completed') THEN gb.booking_status
                         WHEN v_any_paid THEN 'confirmed'::public.guided_booking_status
                         ELSE 'awaiting_payment'::public.guided_booking_status
                       END,
      payment_status = CASE
                         WHEN v_all_paid THEN 'paid'::public.guided_payment_status
                         WHEN v_any_paid THEN 'partial'::public.guided_payment_status
                         ELSE 'unpaid'::public.guided_payment_status
                       END,
      confirmed_at = CASE
                       WHEN v_any_paid THEN COALESCE(gb.confirmed_at, now())
                       ELSE gb.confirmed_at
                     END,
      updated_at = now()
  WHERE gb.id = NEW.booking_id;

  RETURN NEW;
END;
$$;

-- Backfill from payment schedules
WITH payment_rollup AS (
  SELECT
    booking_id,
    COUNT(*) FILTER (WHERE payment_status = 'paid'::public.guided_schedule_payment_status) = COUNT(*) AS all_paid,
    COUNT(*) FILTER (WHERE payment_status = 'paid'::public.guided_schedule_payment_status) > 0 AS any_paid
  FROM public.guided_payment_schedules
  GROUP BY booking_id
)
UPDATE public.guided_bookings gb
SET booking_status = CASE
                       WHEN gb.booking_status IN ('cancelled', 'completed') THEN gb.booking_status
                       WHEN pr.any_paid THEN 'confirmed'::public.guided_booking_status
                       ELSE 'awaiting_payment'::public.guided_booking_status
                     END,
    payment_status = CASE
                       WHEN pr.all_paid THEN 'paid'::public.guided_payment_status
                       WHEN pr.any_paid THEN 'partial'::public.guided_payment_status
                       ELSE 'unpaid'::public.guided_payment_status
                     END,
    confirmed_at = CASE
                     WHEN pr.any_paid THEN COALESCE(gb.confirmed_at, now())
                     ELSE gb.confirmed_at
                   END,
    updated_at = now()
FROM payment_rollup pr
WHERE gb.id = pr.booking_id;

-- Backfill safety for rows with completed payment record but schedule not yet marked paid
UPDATE public.guided_bookings gb
SET booking_status = CASE
                       WHEN gb.booking_status IN ('cancelled', 'completed') THEN gb.booking_status
                       ELSE 'confirmed'::public.guided_booking_status
                     END,
    payment_status = CASE
                       WHEN gb.payment_status = 'unpaid'::public.guided_payment_status THEN 'partial'::public.guided_payment_status
                       ELSE gb.payment_status
                     END,
    confirmed_at = COALESCE(gb.confirmed_at, now()),
    updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.guided_payment_records gpr
  WHERE gpr.booking_id = gb.id
    AND gpr.payment_status = 'completed'::public.guided_record_payment_status
)
AND gb.booking_status NOT IN ('cancelled', 'completed');

NOTIFY pgrst, 'reload schema';
