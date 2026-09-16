CREATE OR REPLACE FUNCTION public.confirm_rejected_settlement_payment(
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

  IF v_payment.status <> 'rejected' THEN
    RAISE EXCEPTION 'Settlement payment must be rejected';
  END IF;

  IF v_payment.recipient_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the recipient can confirm this rejected settlement payment';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.settlement_payment_expenses
  WHERE settlement_payment_id = v_payment.id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Settlement payment has no allocations';
  END IF;

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
    'status', 'settled',
    'allocation_count', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_rejected_settlement_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_rejected_settlement_payment(uuid) TO authenticated;