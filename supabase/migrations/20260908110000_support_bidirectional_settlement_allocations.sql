-- Allow settlement allocations to include both positive and reverse-direction
-- expense participants, netted against the settlement payment amount.

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
  v_direction text;
  v_positive_total numeric(12,2) := 0;
  v_reverse_total numeric(12,2) := 0;
  v_input_count integer;
  v_distinct_count integer;
  v_trip_currency text;
  v_outstanding_amount numeric;
  v_settled_amount numeric;
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
  FROM public.trips t WHERE t.id = p_trip_id;
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
    SELECT * FROM jsonb_to_recordset(p_allocations)
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

    SELECT ep.* INTO v_participant
    FROM public.expense_participants ep
    JOIN public.trip_expenses te ON te.id = ep.expense_id
    JOIN public.expense_payments epay ON epay.expense_id = ep.expense_id
    WHERE ep.id = v_allocation.expense_participant_id
      AND te.trip_id = p_trip_id
      AND te.is_deleted = false
      AND ep.is_paid = false
      AND (
        (ep.user_id = p_payer_id AND epay.user_id = p_recipient_id)
        OR (ep.user_id = p_recipient_id AND epay.user_id = p_payer_id)
      )
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Settlement allocation does not match an outstanding payer or reverse share';
    END IF;
    v_direction := CASE
      WHEN v_participant.user_id = p_payer_id THEN 'positive'
      ELSE 'reverse'
    END;

    SELECT te.* INTO v_expense
    FROM public.trip_expenses te WHERE te.id = v_participant.expense_id;

    IF upper(NULLIF(v_expense.home_currency, '')) = p_currency
       AND v_expense.converted_amount_home IS NOT NULL
       AND v_expense.amount > 0 THEN
      v_outstanding_amount :=
        ((v_participant.amount_owed - v_participant.amount_settled)
          / v_expense.amount) * v_expense.converted_amount_home;
    ELSIF p_currency = upper(COALESCE(NULLIF(v_expense.original_currency, ''), NULLIF(v_expense.currency, ''))) THEN
      v_outstanding_amount := v_participant.amount_owed - v_participant.amount_settled;
    ELSE
      RAISE EXCEPTION 'Cannot validate allocation currency for expense participant %', v_participant.id;
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

    IF v_direction = 'positive' THEN
      v_positive_total := v_positive_total + v_allocation.amount_applied;
    ELSE
      v_reverse_total := v_reverse_total + v_allocation.amount_applied;
    END IF;
  END LOOP;

  IF round(v_positive_total - v_reverse_total, 2) <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Net allocation (% - %) does not equal payment amount %',
      v_positive_total, v_reverse_total, p_amount;
  END IF;
END;
$$;
