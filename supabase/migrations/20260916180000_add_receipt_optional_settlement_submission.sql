CREATE OR REPLACE FUNCTION public.submit_settlement_payment_without_receipt(
  p_settlement_payment_id uuid
)
RETURNS public.settlement_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment public.settlement_payments;
  v_allocation_count integer;
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

  IF v_payment.status <> 'pending' THEN
    RAISE EXCEPTION 'Settlement payment must be pending';
  END IF;

  SELECT count(*) INTO v_allocation_count
  FROM public.settlement_payment_expenses
  WHERE settlement_payment_id = v_payment.id;

  IF v_allocation_count = 0 THEN
    RAISE EXCEPTION 'Settlement payment has no allocations';
  END IF;

  UPDATE public.settlement_payments
  SET status = 'awaiting_confirmation'
  WHERE id = v_payment.id
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_settlement_payment_without_receipt(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_settlement_payment_without_receipt(uuid) TO authenticated;