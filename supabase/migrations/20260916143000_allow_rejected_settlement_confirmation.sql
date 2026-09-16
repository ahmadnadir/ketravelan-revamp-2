CREATE OR REPLACE FUNCTION public.validate_settlement_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status = 'pending' AND NEW.status IN ('awaiting_confirmation', 'cancelled'))
     OR (OLD.status = 'awaiting_confirmation' AND NEW.status IN ('settled', 'rejected', 'cancelled'))
     OR (OLD.status = 'rejected' AND NEW.status IN ('awaiting_confirmation', 'settled', 'cancelled')) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid settlement payment status transition: % -> %', OLD.status, NEW.status;
END;
$$;