/*
  # Hotfix: enforce enum statuses + sync schedule from payment record completion

  Why:
  - booking/payment statuses should be strict enum-like dropdowns in Supabase table editor.
  - frontend schedule/booking updates can be blocked by RLS; payment success must still
    propagate to schedule + booking status server-side.
*/

-- 1) Create enum types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guided_booking_status') THEN
    CREATE TYPE public.guided_booking_status AS ENUM (
      'pending',
      'awaiting_payment',
      'confirmed',
      'cancelled',
      'completed',
      'payment_failed',
      'partially_paid'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guided_payment_status') THEN
    CREATE TYPE public.guided_payment_status AS ENUM (
      'unpaid',
      'partial',
      'paid',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guided_schedule_payment_status') THEN
    CREATE TYPE public.guided_schedule_payment_status AS ENUM (
      'pending',
      'paid',
      'overdue',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guided_record_payment_status') THEN
    CREATE TYPE public.guided_record_payment_status AS ENUM (
      'pending',
      'completed',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

-- 2) Drop legacy text CHECK constraints before type conversion
ALTER TABLE public.guided_bookings
  DROP CONSTRAINT IF EXISTS guided_bookings_booking_status_check,
  DROP CONSTRAINT IF EXISTS guided_bookings_payment_status_check;

ALTER TABLE public.guided_payment_schedules
  DROP CONSTRAINT IF EXISTS guided_payment_schedules_payment_status_check;

ALTER TABLE public.guided_payment_records
  DROP CONSTRAINT IF EXISTS guided_payment_records_payment_status_check;

-- Drop trigger that references guided_payment_records.payment_status before type change.
DROP TRIGGER IF EXISTS trg_reserve_guided_slots_on_payment_completed ON public.guided_payment_records;

-- 3) Convert columns to enum types (keeps values)
ALTER TABLE public.guided_bookings
  ALTER COLUMN booking_status DROP DEFAULT,
  ALTER COLUMN payment_status DROP DEFAULT;

ALTER TABLE public.guided_payment_schedules
  ALTER COLUMN payment_status DROP DEFAULT;

ALTER TABLE public.guided_payment_records
  ALTER COLUMN payment_status DROP DEFAULT;

ALTER TABLE public.guided_bookings
  ALTER COLUMN booking_status TYPE public.guided_booking_status
  USING booking_status::public.guided_booking_status,
  ALTER COLUMN booking_status SET DEFAULT 'awaiting_payment'::public.guided_booking_status,
  ALTER COLUMN payment_status TYPE public.guided_payment_status
  USING payment_status::public.guided_payment_status,
  ALTER COLUMN payment_status SET DEFAULT 'unpaid'::public.guided_payment_status;

ALTER TABLE public.guided_payment_schedules
  ALTER COLUMN payment_status TYPE public.guided_schedule_payment_status
  USING payment_status::public.guided_schedule_payment_status,
  ALTER COLUMN payment_status SET DEFAULT 'pending'::public.guided_schedule_payment_status;

ALTER TABLE public.guided_payment_records
  ALTER COLUMN payment_status TYPE public.guided_record_payment_status
  USING payment_status::public.guided_record_payment_status,
  ALTER COLUMN payment_status SET DEFAULT 'pending'::public.guided_record_payment_status;

-- 4) When payment record becomes completed, mark linked schedule paid.
--    This then triggers sync_guided_booking_payment_status() to update booking_status/payment_status.
CREATE OR REPLACE FUNCTION public.sync_guided_schedule_from_payment_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_id uuid;
BEGIN
  IF NEW.payment_status <> 'completed'::public.guided_record_payment_status THEN
    RETURN NEW;
  END IF;

  v_schedule_id := NEW.payment_schedule_id;

  -- Fallback: if schedule id is missing, pay the earliest pending installment.
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_guided_schedule_from_payment_record ON public.guided_payment_records;
CREATE TRIGGER trg_sync_guided_schedule_from_payment_record
AFTER UPDATE OF payment_status ON public.guided_payment_records
FOR EACH ROW
WHEN (
  OLD.payment_status IS DISTINCT FROM NEW.payment_status
  AND NEW.payment_status = 'completed'::public.guided_record_payment_status
)
EXECUTE FUNCTION public.sync_guided_schedule_from_payment_record();

-- Re-create seat reservation trigger after enum conversion.
CREATE TRIGGER trg_reserve_guided_slots_on_payment_completed
AFTER UPDATE OF payment_status ON public.guided_payment_records
FOR EACH ROW
WHEN (
  OLD.payment_status IS DISTINCT FROM NEW.payment_status
  AND NEW.payment_status = 'completed'::public.guided_record_payment_status
)
EXECUTE FUNCTION public.reserve_guided_departure_slots_for_paid_booking();

NOTIFY pgrst, 'reload schema';
