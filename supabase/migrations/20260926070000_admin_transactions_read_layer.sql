-- Phase 6: read-only finance access for administrators with transactions.view.
-- This uses the existing payment and settlement tables; it creates no ledger.

DO $$
BEGIN
  IF to_regprocedure('public.admin_has_permission(text)') IS NULL THEN
    RAISE EXCEPTION 'Phase 6 requires public.admin_has_permission(text) from the existing Admin RBAC migration';
  END IF;
  IF to_regclass('public.payments') IS NULL
    OR to_regclass('public.guided_payment_records') IS NULL
    OR to_regclass('public.guided_payment_schedules') IS NULL
    OR to_regclass('public.settlement_payments') IS NULL
    OR to_regclass('public.settlement_payment_expenses') IS NULL
    OR to_regclass('public.settlement_payment_receipts') IS NULL THEN
    RAISE EXCEPTION 'Phase 6 finance source tables are incomplete; inspect the production schema before applying';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_finance_can_view()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(public.admin_has_permission('transactions.view'), false);
$$;

REVOKE ALL ON FUNCTION public.admin_finance_can_view() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_finance_can_view() TO authenticated;

DROP POLICY IF EXISTS admin_finance_payments_select ON public.payments;
CREATE POLICY admin_finance_payments_select ON public.payments
  FOR SELECT TO authenticated USING (public.admin_finance_can_view());

DROP POLICY IF EXISTS admin_finance_settlement_payments_select ON public.settlement_payments;
CREATE POLICY admin_finance_settlement_payments_select ON public.settlement_payments
  FOR SELECT TO authenticated USING (public.admin_finance_can_view());

DROP POLICY IF EXISTS admin_finance_settlement_expenses_select ON public.settlement_payment_expenses;
CREATE POLICY admin_finance_settlement_expenses_select ON public.settlement_payment_expenses
  FOR SELECT TO authenticated USING (public.admin_finance_can_view());

DROP POLICY IF EXISTS admin_finance_settlement_receipts_select ON public.settlement_payment_receipts;
CREATE POLICY admin_finance_settlement_receipts_select ON public.settlement_payment_receipts
  FOR SELECT TO authenticated USING (public.admin_finance_can_view());

-- The snapshot contains broad ALL policies for anon/authenticated on guided
-- payment records and schedules. Remove client-side financial writes; trusted
-- webhook/service-role processes remain able to write these tables.
DROP POLICY IF EXISTS "Guided payment records manage by authenticated" ON public.guided_payment_records;
DROP POLICY IF EXISTS "Guided payment records customer update" ON public.guided_payment_records;
DROP POLICY IF EXISTS "Guided payment schedules manage by authenticated" ON public.guided_payment_schedules;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.guided_payment_records, public.guided_payment_schedules FROM anon, authenticated;

DROP POLICY IF EXISTS admin_finance_guided_payment_records_select ON public.guided_payment_records;
CREATE POLICY admin_finance_guided_payment_records_select ON public.guided_payment_records
  FOR SELECT TO authenticated USING (public.admin_finance_can_view());

DROP POLICY IF EXISTS admin_finance_guided_payment_schedules_select ON public.guided_payment_schedules;
CREATE POLICY admin_finance_guided_payment_schedules_select ON public.guided_payment_schedules
  FOR SELECT TO authenticated USING (public.admin_finance_can_view());

GRANT SELECT ON public.payments, public.guided_payment_records, public.guided_payment_schedules,
  public.settlement_payments, public.settlement_payment_expenses,
  public.settlement_payment_receipts TO authenticated;

DROP POLICY IF EXISTS admin_finance_trips_select ON public.trips;
CREATE POLICY admin_finance_trips_select ON public.trips
  FOR SELECT TO authenticated USING (public.admin_finance_can_view());
GRANT SELECT ON public.trips TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_finance_summary()
RETURNS TABLE (
  source text,
  currency text,
  status text,
  record_count bigint,
  total_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.admin_finance_can_view() THEN
    RAISE EXCEPTION 'Finance read access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 'standard_payment'::text, coalesce(p.currency, 'UNKNOWN')::text, p.status::text,
    count(*)::bigint, coalesce(sum(p.amount), 0)::numeric
  FROM public.payments p
  GROUP BY coalesce(p.currency, 'UNKNOWN'), p.status::text
  UNION ALL
  SELECT 'guided_payment_record'::text, NULL::text, gpr.payment_status::text,
    count(*)::bigint, coalesce(sum(gpr.amount), 0)::numeric
  FROM public.guided_payment_records gpr
  GROUP BY gpr.payment_status::text
  UNION ALL
  SELECT 'settlement_payment'::text, sp.currency::text, sp.status::text,
    count(*)::bigint, coalesce(sum(sp.amount), 0)::numeric
  FROM public.settlement_payments sp
  GROUP BY sp.currency, sp.status
  ;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_finance_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_finance_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_settlement_detail(p_settlement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_detail jsonb;
BEGIN
  IF NOT public.admin_finance_can_view() THEN
    RAISE EXCEPTION 'Finance read access required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'amount', sp.amount,
    'currency', sp.currency,
    'status', sp.status,
    'created_at', sp.created_at,
    'confirmed_at', sp.confirmed_at,
    'rejected_at', sp.rejected_at,
    'rejection_reason', sp.rejection_reason,
    'trip_name', coalesce(nullif(btrim(t.title), ''), 'Trip'),
    'payer_name', coalesce(nullif(btrim(payer.full_name), ''), nullif(btrim(payer.username), ''), 'Trip participant'),
    'recipient_name', coalesce(nullif(btrim(recipient.full_name), ''), nullif(btrim(recipient.username), ''), 'Trip participant'),
    'allocations', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'expense_title', coalesce(nullif(btrim(te.description), ''), 'Untitled expense'),
          'expense_category', coalesce(nullif(btrim(ec.name), ''), nullif(btrim(te.category), ''), 'Uncategorized'),
          'expense_date', te.expense_date,
          'expense_currency', coalesce(te.original_currency, te.currency),
          'amount_applied', spe.amount_applied,
          'participant_name', coalesce(nullif(btrim(participant.full_name), ''), nullif(btrim(participant.username), ''), 'Trip participant'),
          'participant_share', ep.amount_owed,
          'participant_paid', coalesce(ep.is_paid, false)
        ) ORDER BY te.expense_date DESC, te.created_at DESC
      )
      FROM public.settlement_payment_expenses spe
      JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
      JOIN public.trip_expenses te ON te.id = ep.expense_id
      LEFT JOIN public.expense_categories ec ON ec.code = te.category_code
      LEFT JOIN public.profiles participant ON participant.id = ep.user_id
      WHERE spe.settlement_payment_id = sp.id
    ), '[]'::jsonb),
    'receipts', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'receipt_url', spr.receipt_url,
          'description', spr.description,
          'status', spr.status,
          'reviewed_at', spr.reviewed_at,
          'rejection_reason', spr.rejection_reason,
          'created_at', spr.created_at,
          'uploaded_by_name', coalesce(nullif(btrim(uploader.full_name), ''), nullif(btrim(uploader.username), ''), 'Trip participant')
        ) ORDER BY spr.created_at DESC
      )
      FROM public.settlement_payment_receipts spr
      LEFT JOIN public.profiles uploader ON uploader.id = spr.uploaded_by
      WHERE spr.settlement_payment_id = sp.id
    ), '[]'::jsonb)
  )
  INTO v_detail
  FROM public.settlement_payments sp
  LEFT JOIN public.trips t ON t.id = sp.trip_id
  LEFT JOIN public.profiles payer ON payer.id = sp.payer_id
  LEFT JOIN public.profiles recipient ON recipient.id = sp.recipient_id
  WHERE sp.id = p_settlement_id;

  RETURN v_detail;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_settlement_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_settlement_detail(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';