-- Additive partial settlement support.
-- Existing rows are backfilled from the legacy all-or-nothing is_paid flag.

ALTER TABLE public.expense_participants
  ADD COLUMN amount_settled numeric(10,2) NOT NULL DEFAULT 0;

UPDATE public.expense_participants
SET amount_settled = amount_owed
WHERE is_paid = true;

ALTER TABLE public.expense_participants
  ADD CONSTRAINT expense_participants_amount_settled_check
  CHECK (amount_settled >= 0 AND amount_settled <= amount_owed);

CREATE INDEX expense_participants_outstanding_idx
  ON public.expense_participants (expense_id, user_id, is_paid, amount_settled);

CREATE OR REPLACE FUNCTION public.sync_expense_participant_settled_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_paid THEN
    NEW.amount_settled := NEW.amount_owed;
  ELSE
    NEW.amount_settled := LEAST(GREATEST(COALESCE(NEW.amount_settled, 0), 0), NEW.amount_owed);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_expense_participant_settled_amount
BEFORE INSERT OR UPDATE OF amount_owed, amount_settled, is_paid
ON public.expense_participants
FOR EACH ROW
EXECUTE FUNCTION public.sync_expense_participant_settled_amount();

CREATE OR REPLACE FUNCTION public.get_who_owes_who(p_trip_id uuid)
RETURNS TABLE (
  debtor_id uuid,
  debtor_name text,
  debtor_avatar text,
  creditor_id uuid,
  creditor_name text,
  creditor_avatar text,
  amount numeric
)
LANGUAGE sql
AS $$
WITH te AS (
  SELECT id FROM public.trip_expenses
  WHERE trip_id = p_trip_id AND is_deleted = false
),
payers AS (
  SELECT ep.expense_id, ep.user_id AS payer_id, COALESCE(ep.amount_paid, 0) AS amount_paid
  FROM public.expense_payments ep JOIN te ON te.id = ep.expense_id
),
expense_pay_totals AS (
  SELECT expense_id, COALESCE(SUM(amount_paid), 0) AS total_paid
  FROM payers GROUP BY expense_id
),
participant_shares AS (
  SELECT epart.expense_id,
         epart.user_id AS debtor_id,
         GREATEST(COALESCE(epart.amount_owed, 0) - COALESCE(epart.amount_settled, 0), 0) AS amount_owed
  FROM public.expense_participants epart
  JOIN te ON te.id = epart.expense_id
  WHERE epart.amount_owed > epart.amount_settled
),
owed_edges AS (
  SELECT ps.debtor_id, p.payer_id AS creditor_id,
         SUM(CASE WHEN ept.total_paid IS NULL OR ept.total_paid = 0
             THEN ps.amount_owed
             ELSE ps.amount_owed * (p.amount_paid / ept.total_paid)
         END) AS amount
  FROM participant_shares ps
  JOIN payers p ON p.expense_id = ps.expense_id
  LEFT JOIN expense_pay_totals ept ON ept.expense_id = p.expense_id
  GROUP BY ps.debtor_id, p.payer_id
),
pairwise_net AS (
  SELECT COALESCE(a.debtor_id, b.creditor_id) AS debtor_id,
         COALESCE(a.creditor_id, b.debtor_id) AS creditor_id,
         COALESCE(a.amount, 0) - COALESCE(b.amount, 0) AS net_amount
  FROM owed_edges a
  FULL OUTER JOIN owed_edges b
    ON a.debtor_id = b.creditor_id AND a.creditor_id = b.debtor_id
),
positive_pairs AS (
  SELECT debtor_id, creditor_id, net_amount AS amount
  FROM pairwise_net WHERE net_amount > 0
)
SELECT pp.debtor_id, d.full_name, d.avatar_url,
       pp.creditor_id, c.full_name, c.avatar_url, pp.amount
FROM positive_pairs pp
JOIN public.profiles d ON d.id = pp.debtor_id
JOIN public.profiles c ON c.id = pp.creditor_id
ORDER BY pp.amount DESC;
$$;

CREATE OR REPLACE FUNCTION public.confirm_settlement_payment(p_settlement_payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment public.settlement_payments;
  v_receipt public.settlement_payment_receipts;
  v_participant public.expense_participants%ROWTYPE;
  v_expense public.trip_expenses%ROWTYPE;
  v_allocation record;
  v_count integer;
  v_original_applied numeric(12,2);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_payment
  FROM public.settlement_payments
  WHERE id = p_settlement_payment_id
  FOR UPDATE;

  IF NOT FOUND OR v_payment.status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Settlement payment must be awaiting confirmation';
  END IF;
  IF v_payment.recipient_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the recipient can confirm this settlement payment';
  END IF;

  SELECT * INTO v_receipt
  FROM public.settlement_payment_receipts
  WHERE settlement_payment_id = v_payment.id AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending settlement receipt not found'; END IF;

  SELECT count(*) INTO v_count
  FROM public.settlement_payment_expenses
  WHERE settlement_payment_id = v_payment.id;
  IF v_count = 0 THEN RAISE EXCEPTION 'Settlement payment has no allocations'; END IF;

  PERFORM public.validate_settlement_allocations(
    v_payment.trip_id, v_payment.payer_id, v_payment.recipient_id,
    v_payment.amount, v_payment.currency,
    (SELECT jsonb_agg(jsonb_build_object(
      'expense_participant_id', spe.expense_participant_id,
      'amount_applied', spe.amount_applied
    )) FROM public.settlement_payment_expenses spe
     WHERE spe.settlement_payment_id = v_payment.id),
    v_payment.id
  );

  FOR v_allocation IN
    SELECT spe.expense_participant_id, spe.amount_applied
    FROM public.settlement_payment_expenses spe
    WHERE spe.settlement_payment_id = v_payment.id
    ORDER BY spe.expense_participant_id
  LOOP
    SELECT * INTO v_participant
    FROM public.expense_participants
    WHERE id = v_allocation.expense_participant_id
    FOR UPDATE;

    SELECT * INTO v_expense
    FROM public.trip_expenses
    WHERE id = v_participant.expense_id;

    IF v_expense.converted_amount_home IS NOT NULL
       AND v_expense.home_currency = v_payment.currency
       AND v_expense.amount > 0 THEN
      v_original_applied :=
        v_allocation.amount_applied * v_expense.amount / v_expense.converted_amount_home;
    ELSE
      v_original_applied := v_allocation.amount_applied;
    END IF;

    UPDATE public.expense_participants
    SET amount_settled = LEAST(amount_owed, amount_settled + v_original_applied),
        is_paid = (LEAST(amount_owed, amount_settled + v_original_applied) >= amount_owed),
        paid_at = CASE
          WHEN LEAST(amount_owed, amount_settled + v_original_applied) >= amount_owed
          THEN now()
          ELSE paid_at
        END
    WHERE id = v_participant.id;
  END LOOP;

  UPDATE public.settlement_payment_receipts
  SET status = 'approved', reviewed_by = v_user_id, reviewed_at = now()
  WHERE id = v_receipt.id;

  UPDATE public.settlement_payments
  SET status = 'settled', confirmed_by = v_user_id, confirmed_at = now()
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'settlement_payment_id', v_payment.id,
    'receipt_id', v_receipt.id,
    'status', 'settled',
    'allocation_count', v_count
  );
END;
$$;
