CREATE OR REPLACE FUNCTION public.record_manual_settlement(
  p_trip_id uuid,
  p_payer_id uuid,
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_user_id IS DISTINCT FROM p_recipient_id THEN
    RAISE EXCEPTION 'Only the settlement recipient can record a manual settlement';
  END IF;

  SELECT * INTO v_payment
  FROM public.settlement_payments
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    RETURN v_payment;
  END IF;

  PERFORM public.validate_settlement_allocations(
    p_trip_id, p_payer_id, p_recipient_id, p_amount, p_currency, p_allocations, NULL
  );

  INSERT INTO public.settlement_payments (
    trip_id, payer_id, recipient_id, amount, currency, status,
    idempotency_key, created_by, confirmed_by, confirmed_at
  ) VALUES (
    p_trip_id, p_payer_id, p_recipient_id, p_amount, p_currency, 'settled',
    p_idempotency_key, v_user_id, v_user_id, now()
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

REVOKE ALL ON FUNCTION public.record_manual_settlement(uuid, uuid, uuid, numeric, varchar, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_manual_settlement(uuid, uuid, uuid, numeric, varchar, uuid, jsonb) TO authenticated;