-- Additive settlement payment architecture.
-- Existing expense_receipts and expense settlement logic are intentionally unchanged.

DO $$
BEGIN
  IF to_regclass('public.settlement_payments') IS NOT NULL
    OR to_regclass('public.settlement_payment_expenses') IS NOT NULL
    OR to_regclass('public.settlement_payment_receipts') IS NOT NULL THEN
    RAISE EXCEPTION 'Settlement payment tables already exist; inspect before applying this migration';
  END IF;

  IF to_regprocedure('public.create_settlement_payment(uuid,uuid,numeric,character varying,uuid,jsonb)') IS NOT NULL
    OR to_regprocedure('public.submit_settlement_payment_receipt(uuid,text,text)') IS NOT NULL
    OR to_regprocedure('public.reject_settlement_payment_receipt(uuid,text)') IS NOT NULL
    OR to_regprocedure('public.confirm_settlement_payment(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'Settlement payment functions already exist; inspect before applying this migration';
  END IF;
END;
$$;

CREATE TABLE public.settlement_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_confirmation', 'settled', 'rejected', 'cancelled')),
  idempotency_key uuid NOT NULL UNIQUE,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejection_reason text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payer_id <> recipient_id)
);

CREATE TABLE public.settlement_payment_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_payment_id uuid NOT NULL
    REFERENCES public.settlement_payments(id) ON DELETE CASCADE,
  expense_participant_id uuid NOT NULL
    REFERENCES public.expense_participants(id) ON DELETE RESTRICT,
  amount_applied numeric(12,2) NOT NULL CHECK (amount_applied > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (settlement_payment_id, expense_participant_id)
);

CREATE TABLE public.settlement_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_payment_id uuid NOT NULL
    REFERENCES public.settlement_payments(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  receipt_url text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX settlement_payment_one_active_receipt
  ON public.settlement_payment_receipts (settlement_payment_id)
  WHERE status IN ('pending', 'approved');

CREATE INDEX settlement_payments_trip_status_idx
  ON public.settlement_payments (trip_id, status);
CREATE INDEX settlement_payments_payer_recipient_idx
  ON public.settlement_payments (payer_id, recipient_id);
CREATE INDEX settlement_payment_expenses_payment_idx
  ON public.settlement_payment_expenses (settlement_payment_id);
CREATE INDEX settlement_payment_expenses_participant_idx
  ON public.settlement_payment_expenses (expense_participant_id);
CREATE INDEX settlement_payment_receipts_payment_status_idx
  ON public.settlement_payment_receipts (settlement_payment_id, status);

CREATE OR REPLACE FUNCTION public.set_settlement_payment_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER settlement_payments_updated_at
BEFORE UPDATE ON public.settlement_payments
FOR EACH ROW EXECUTE FUNCTION public.set_settlement_payment_updated_at();

CREATE TRIGGER settlement_payment_receipts_updated_at
BEFORE UPDATE ON public.settlement_payment_receipts
FOR EACH ROW EXECUTE FUNCTION public.set_settlement_payment_updated_at();

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
     OR (OLD.status = 'rejected' AND NEW.status IN ('awaiting_confirmation', 'cancelled')) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid settlement payment status transition: % -> %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER validate_settlement_payment_status
BEFORE UPDATE OF status ON public.settlement_payments
FOR EACH ROW EXECUTE FUNCTION public.validate_settlement_payment_status_transition();

ALTER TABLE public.settlement_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payment_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY settlement_payments_select
ON public.settlement_payments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.trip_members tm
  WHERE tm.trip_id = settlement_payments.trip_id
    AND tm.user_id = auth.uid()
    AND tm.left_at IS NULL
));

CREATE POLICY settlement_payment_expenses_select
ON public.settlement_payment_expenses FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.settlement_payments sp
  JOIN public.trip_members tm ON tm.trip_id = sp.trip_id
  WHERE sp.id = settlement_payment_expenses.settlement_payment_id
    AND tm.user_id = auth.uid()
    AND tm.left_at IS NULL
));

CREATE POLICY settlement_payment_receipts_select
ON public.settlement_payment_receipts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.settlement_payments sp
  JOIN public.trip_members tm ON tm.trip_id = sp.trip_id
  WHERE sp.id = settlement_payment_receipts.settlement_payment_id
    AND tm.user_id = auth.uid()
    AND tm.left_at IS NULL
));

-- All writes occur through SECURITY DEFINER functions after validation.
CREATE OR REPLACE FUNCTION public.validate_settlement_allocations(
  p_trip_id uuid,
  p_payer_id uuid,
  p_recipient_id uuid,
  p_amount numeric,
  p_currency varchar,
  p_allocations jsonb,
  p_exclude_payment_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allocation record;
  v_participant public.expense_participants%ROWTYPE;
  v_expense public.trip_expenses%ROWTYPE;
  v_total numeric(12,2) := 0;
  v_input_count integer;
  v_distinct_count integer;
  v_trip_currency text;
  v_outstanding_amount numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be positive';
  END IF;

  IF p_currency IS NULL OR p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Settlement currency must be exactly three uppercase letters';
  END IF;

  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) <> 'array'
     OR jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'At least one settlement allocation is required';
  END IF;

  SELECT upper(NULLIF(t.currency_settings->>'home_currency', ''))
  INTO v_trip_currency
  FROM public.trips t
  WHERE t.id = p_trip_id;

  IF v_trip_currency IS NOT NULL AND p_currency <> v_trip_currency THEN
    RAISE EXCEPTION 'Settlement currency % does not match configured trip home currency %',
      p_currency, v_trip_currency;
  END IF;

  SELECT count(*), count(DISTINCT a.expense_participant_id)
  INTO v_input_count, v_distinct_count
  FROM jsonb_to_recordset(p_allocations)
    AS a(expense_participant_id uuid, amount_applied numeric);

  IF v_input_count <> v_distinct_count THEN
    RAISE EXCEPTION 'Duplicate expense participant allocation';
  END IF;

  FOR v_allocation IN
    SELECT *
    FROM jsonb_to_recordset(p_allocations)
      AS a(expense_participant_id uuid, amount_applied numeric)
    ORDER BY a.expense_participant_id
  LOOP
    IF v_allocation.expense_participant_id IS NULL
       OR v_allocation.amount_applied IS NULL
       OR v_allocation.amount_applied <= 0 THEN
      RAISE EXCEPTION 'Settlement allocation is invalid';
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtextextended(v_allocation.expense_participant_id::text, 0)
    );

    SELECT ep.*
    INTO v_participant
    FROM public.expense_participants ep
    JOIN public.trip_expenses te ON te.id = ep.expense_id
    JOIN public.expense_payments epay ON epay.expense_id = ep.expense_id
    WHERE ep.id = v_allocation.expense_participant_id
      AND te.trip_id = p_trip_id
      AND te.is_deleted = false
      AND ep.user_id = p_payer_id
      AND ep.is_paid = false
      AND epay.user_id = p_recipient_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Settlement allocation does not match an outstanding payer share';
    END IF;

    SELECT te.*
    INTO v_expense
    FROM public.trip_expenses te
    WHERE te.id = v_participant.expense_id;

    IF upper(NULLIF(v_expense.home_currency, '')) = p_currency
       AND v_expense.converted_amount_home IS NOT NULL
       AND v_expense.amount > 0 THEN
      v_outstanding_amount :=
        (v_participant.amount_owed / v_expense.amount) * v_expense.converted_amount_home;
    ELSIF p_currency = upper(COALESCE(NULLIF(v_expense.original_currency, ''), NULLIF(v_expense.currency, ''))) THEN
      v_outstanding_amount := v_participant.amount_owed;
    ELSE
      RAISE EXCEPTION
        'Cannot validate allocation currency for expense participant %',
        v_participant.id;
    END IF;

    IF v_allocation.amount_applied > round(v_outstanding_amount, 2) THEN
      RAISE EXCEPTION 'Settlement allocation exceeds the participant outstanding amount';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.settlement_payment_expenses spe
      JOIN public.settlement_payments sp ON sp.id = spe.settlement_payment_id
      WHERE spe.expense_participant_id = v_participant.id
        AND sp.status IN ('pending', 'awaiting_confirmation')
        AND sp.id IS DISTINCT FROM p_exclude_payment_id
    ) THEN
      RAISE EXCEPTION 'Participant already belongs to an active settlement payment';
    END IF;

    v_total := v_total + v_allocation.amount_applied;
  END LOOP;

  IF round(v_total, 2) <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Allocation total % does not equal payment amount %', v_total, p_amount;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_settlement_payment(
  p_trip_id uuid,
  p_recipient_id uuid,
  p_amount numeric,
  p_currency varchar,
  p_idempotency_key uuid,
  p_allocations jsonb
)
RETURNS public.settlement_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment public.settlement_payments;
  v_existing_count integer;
  v_input_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.settlement_payments
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    SELECT count(*)
    INTO v_input_count
    FROM jsonb_to_recordset(p_allocations)
      AS a(expense_participant_id uuid, amount_applied numeric);

    SELECT count(*)
    INTO v_existing_count
    FROM public.settlement_payment_expenses
    WHERE settlement_payment_id = v_payment.id;

    IF v_payment.trip_id IS DISTINCT FROM p_trip_id
       OR v_payment.payer_id IS DISTINCT FROM v_user_id
       OR v_payment.recipient_id IS DISTINCT FROM p_recipient_id
       OR round(v_payment.amount, 2) <> round(p_amount, 2)
       OR v_payment.currency IS DISTINCT FROM p_currency
       OR v_existing_count <> v_input_count
       OR EXISTS (
         SELECT 1
         FROM jsonb_to_recordset(p_allocations)
           AS a(expense_participant_id uuid, amount_applied numeric)
         WHERE NOT EXISTS (
           SELECT 1
           FROM public.settlement_payment_expenses spe
           WHERE spe.settlement_payment_id = v_payment.id
             AND spe.expense_participant_id = a.expense_participant_id
             AND round(spe.amount_applied, 2) = round(a.amount_applied, 2)
         )
       ) THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different settlement payment request';
    END IF;

    RETURN v_payment;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = v_user_id
      AND tm.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Payer is not an active trip member';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = p_recipient_id
      AND tm.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Recipient is not an active trip member';
  END IF;

  PERFORM public.validate_settlement_allocations(
    p_trip_id, v_user_id, p_recipient_id, p_amount, p_currency, p_allocations, NULL
  );

  INSERT INTO public.settlement_payments (
    trip_id, payer_id, recipient_id, amount, currency,
    idempotency_key, created_by
  ) VALUES (
    p_trip_id, v_user_id, p_recipient_id, p_amount, p_currency,
    p_idempotency_key, v_user_id
  )
  RETURNING * INTO v_payment;

  INSERT INTO public.settlement_payment_expenses (
    settlement_payment_id, expense_participant_id, amount_applied
  )
  SELECT v_payment.id, a.expense_participant_id, a.amount_applied
  FROM jsonb_to_recordset(p_allocations)
    AS a(expense_participant_id uuid, amount_applied numeric);

  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_settlement_payment_receipt(
  p_settlement_payment_id uuid,
  p_receipt_url text,
  p_description text DEFAULT NULL
)
RETURNS public.settlement_payment_receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment public.settlement_payments;
  v_receipt public.settlement_payment_receipts;
  v_allocations jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_payment
  FROM public.settlement_payments
  WHERE id = p_settlement_payment_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.payer_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Settlement payment not found or not owned by payer';
  END IF;

  IF v_payment.status NOT IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'Settlement payment cannot accept a receipt in status %', v_payment.status;
  END IF;

  IF p_receipt_url IS NULL OR btrim(p_receipt_url) = '' THEN
    RAISE EXCEPTION 'Receipt URL is required';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'expense_participant_id', spe.expense_participant_id,
    'amount_applied', spe.amount_applied
  ))
  INTO v_allocations
  FROM public.settlement_payment_expenses spe
  WHERE spe.settlement_payment_id = v_payment.id;

  PERFORM public.validate_settlement_allocations(
    v_payment.trip_id, v_payment.payer_id, v_payment.recipient_id,
    v_payment.amount, v_payment.currency, COALESCE(v_allocations, '[]'::jsonb), v_payment.id
  );

  INSERT INTO public.settlement_payment_receipts (
    settlement_payment_id, uploaded_by, receipt_url, description, status
  ) VALUES (
    v_payment.id, v_user_id, p_receipt_url, p_description, 'pending'
  )
  RETURNING * INTO v_receipt;

  UPDATE public.settlement_payments
  SET status = 'awaiting_confirmation',
      rejected_by = NULL,
      rejected_at = NULL,
      rejection_reason = NULL
  WHERE id = v_payment.id;

  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_settlement_payment_receipt(
  p_settlement_payment_id uuid,
  p_reason text
)
RETURNS public.settlement_payment_receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment public.settlement_payments;
  v_receipt public.settlement_payment_receipts;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_payment
  FROM public.settlement_payments
  WHERE id = p_settlement_payment_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.recipient_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Settlement payment not found or not owned by recipient';
  END IF;

  IF v_payment.status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Settlement payment must be awaiting confirmation';
  END IF;

  SELECT * INTO v_receipt
  FROM public.settlement_payment_receipts
  WHERE settlement_payment_id = v_payment.id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending settlement receipt not found';
  END IF;

  UPDATE public.settlement_payment_receipts
  SET status = 'rejected',
      reviewed_by = v_user_id,
      reviewed_at = now(),
      rejection_reason = p_reason
  WHERE id = v_receipt.id
  RETURNING * INTO v_receipt;

  UPDATE public.settlement_payments
  SET status = 'rejected',
      rejected_by = v_user_id,
      rejected_at = now(),
      rejection_reason = p_reason
  WHERE id = v_payment.id;

  RETURN v_receipt;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_settlement_payment(
  p_settlement_payment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment public.settlement_payments;
  v_receipt public.settlement_payment_receipts;
  v_allocations jsonb;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_payment
  FROM public.settlement_payments
  WHERE id = p_settlement_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement payment not found';
  END IF;

  IF v_payment.status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Settlement payment must be awaiting confirmation';
  END IF;

  IF v_payment.recipient_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the recipient can confirm this settlement payment';
  END IF;

  SELECT * INTO v_receipt
  FROM public.settlement_payment_receipts
  WHERE settlement_payment_id = v_payment.id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending settlement receipt not found';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'expense_participant_id', spe.expense_participant_id,
    'amount_applied', spe.amount_applied
  ) ORDER BY spe.expense_participant_id), count(*)
  INTO v_allocations, v_count
  FROM public.settlement_payment_expenses spe
  WHERE spe.settlement_payment_id = v_payment.id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Settlement payment has no allocations';
  END IF;

  PERFORM public.validate_settlement_allocations(
    v_payment.trip_id, v_payment.payer_id, v_payment.recipient_id,
    v_payment.amount, v_payment.currency, v_allocations, v_payment.id
  );

  UPDATE public.settlement_payment_receipts
  SET status = 'approved',
      reviewed_by = v_user_id,
      reviewed_at = now()
  WHERE id = v_receipt.id;

  UPDATE public.settlement_payments
  SET status = 'settled',
      confirmed_by = v_user_id,
      confirmed_at = now()
  WHERE id = v_payment.id;

  UPDATE public.expense_participants ep
  SET is_paid = true,
      paid_at = now()
  FROM public.settlement_payment_expenses spe
  WHERE spe.settlement_payment_id = v_payment.id
    AND ep.id = spe.expense_participant_id;

  RETURN jsonb_build_object(
    'settlement_payment_id', v_payment.id,
    'receipt_id', v_receipt.id,
    'status', 'settled',
    'allocation_count', v_count
  );
END;
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.settlement_payments TO authenticated;
GRANT SELECT ON public.settlement_payment_expenses TO authenticated;
GRANT SELECT ON public.settlement_payment_receipts TO authenticated;

REVOKE ALL ON FUNCTION public.validate_settlement_allocations(uuid, uuid, uuid, numeric, varchar, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_settlement_payment(uuid, uuid, numeric, varchar, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_settlement_payment_receipt(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_settlement_payment_receipt(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_settlement_payment(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_settlement_payment(uuid, uuid, numeric, varchar, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_settlement_payment_receipt(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_settlement_payment_receipt(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_settlement_payment(uuid) TO authenticated;
