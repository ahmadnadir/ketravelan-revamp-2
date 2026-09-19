-- Migrates all eligible legacy settled expense participants into settled
-- settlement_payments without modifying existing settlement records.
-- Home-currency conversion uses only the historical snapshot on trip_expenses.

BEGIN;

CREATE TEMP TABLE tmp_candidate_participants ON COMMIT DROP AS
WITH candidate AS (
  SELECT
    ep.id AS expense_participant_id,
    ep.user_id AS debtor_id,
    ep.amount_settled,
    te.id AS expense_id,
    te.trip_id,
    te.currency AS original_currency,
    te.amount AS expense_amount,
    te.converted_amount_home,
    te.home_currency AS expense_home_currency,
    ep.paid_at,
    COALESCE(
      (SELECT epay.user_id FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id LIMIT 1),
      te.created_by
    ) AS creditor_id,
    EXISTS (
      SELECT 1
      FROM public.settlement_payment_expenses spe
      WHERE spe.expense_participant_id = ep.id
    ) AS already_linked,
    CASE
      WHEN UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''),
                          NULLIF(TRIM(t.currency_settings ->> 'home_currency'), ''))) ~ '^[A-Z]{3}$'
        THEN UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''),
                            NULLIF(TRIM(t.currency_settings ->> 'home_currency'), '')))
      ELSE NULL
    END AS trip_home_currency
  FROM public.expense_participants ep
  JOIN public.trip_expenses te ON te.id = ep.expense_id
  JOIN public.trips t ON t.id = te.trip_id
  WHERE ep.is_paid = true
    AND ep.amount_settled > 0
    AND ep.paid_at IS NOT NULL
),
flagged AS (
  SELECT
    c.*,
    (c.creditor_id IS NULL) AS missing_recipient,
    (c.original_currency IS NULL OR c.original_currency !~ '^[A-Z]{3}$') AS invalid_currency,
    (c.creditor_id IS NOT NULL AND c.debtor_id = c.creditor_id) AS self_settlement
  FROM candidate c
)
SELECT
  f.*,
  CASE
    WHEN f.trip_home_currency IS NOT NULL
      AND (
        f.original_currency = f.trip_home_currency
        OR (
          f.converted_amount_home IS NOT NULL
          AND f.expense_amount > 0
          AND UPPER(COALESCE(f.expense_home_currency, '')) = f.trip_home_currency
        )
      )
      THEN f.trip_home_currency
    ELSE f.original_currency
  END AS settlement_currency,
  CASE
    WHEN f.trip_home_currency IS NULL THEN f.amount_settled
    WHEN f.original_currency = f.trip_home_currency THEN f.amount_settled
    WHEN f.converted_amount_home IS NOT NULL
      AND f.expense_amount > 0
      AND UPPER(COALESCE(f.expense_home_currency, '')) = f.trip_home_currency
      THEN ROUND((f.amount_settled / f.expense_amount) * f.converted_amount_home, 2)
    WHEN f.trip_home_currency IS NOT NULL THEN f.amount_settled
    ELSE NULL
  END AS converted_amount
FROM flagged f;

CREATE TEMP TABLE tmp_eligible_participants ON COMMIT DROP AS
SELECT *
FROM tmp_candidate_participants
WHERE NOT already_linked
  AND NOT missing_recipient
  AND NOT invalid_currency
  AND NOT self_settlement;

-- The original-currency fallback above handles missing historical snapshots.
-- Keep this guard for any unexpected null amount before inserting.
DO $guard_conversion$
DECLARE
  v_missing_count integer;
BEGIN
  SELECT count(*)
  INTO v_missing_count
  FROM tmp_eligible_participants
  WHERE converted_amount IS NULL;

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'Historical conversion unavailable for % eligible participant(s); migration aborted', v_missing_count;
  END IF;
END;
$guard_conversion$;

-- Net both directions per (trip, unordered pair, settlement currency); only
-- the net direction is proposed. When no trip home currency exists, each
-- expense is settled in its original currency.
CREATE TEMP TABLE tmp_proposed_settlements ON COMMIT DROP AS
WITH pair_direction AS (
  SELECT
    trip_id,
    settlement_currency,
    LEAST(debtor_id, creditor_id) AS person_a,
    GREATEST(debtor_id, creditor_id) AS person_b,
    debtor_id, creditor_id, converted_amount, paid_at
  FROM tmp_eligible_participants
),
pair_totals_clean AS (
  SELECT
    trip_id, settlement_currency, person_a, person_b,
    COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = person_a), 0) AS a_to_b_gross,
    COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = person_b), 0) AS b_to_a_gross,
    MAX(paid_at) AS latest_paid_at
  FROM pair_direction
  GROUP BY trip_id, settlement_currency, person_a, person_b
)
SELECT
  trip_id,
  settlement_currency AS currency,
  CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END AS payer_id,
  CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END AS recipient_id,
  ROUND(ABS(a_to_b_gross - b_to_a_gross)::numeric, 2) AS net_amount,
  latest_paid_at,
  (
    substr(md5('legacy-settlement-migration:v4:' || trip_id || ':' || settlement_currency || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 1, 8) || '-' ||
    substr(md5('legacy-settlement-migration:v4:' || trip_id || ':' || settlement_currency || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 9, 4) || '-' ||
    substr(md5('legacy-settlement-migration:v4:' || trip_id || ':' || settlement_currency || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 13, 4) || '-' ||
    substr(md5('legacy-settlement-migration:v4:' || trip_id || ':' || settlement_currency || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 17, 4) || '-' ||
    substr(md5('legacy-settlement-migration:v4:' || trip_id || ':' || settlement_currency || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
      (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 21, 12)
  )::uuid AS idempotency_key
FROM pair_totals_clean
WHERE ROUND(ABS(a_to_b_gross - b_to_a_gross)::numeric, 2) > 0;

-- Global guard: deterministic idempotency_keys must be unique.
DO $guard_unique$
DECLARE
  v_total integer;
  v_distinct integer;
BEGIN
  SELECT count(*), count(DISTINCT idempotency_key) INTO v_total, v_distinct FROM tmp_proposed_settlements;
  IF v_total <> v_distinct THEN
    RAISE EXCEPTION 'Duplicate deterministic idempotency_key detected among proposed settlements (% total, % distinct)', v_total, v_distinct;
  END IF;
END;
$guard_unique$;

-- If a settlement_payments row already exists for a deterministic key, it must
-- match the proposed values exactly.
DO $guard_preexisting_match$
DECLARE
  v_mismatch_count integer;
BEGIN
  SELECT count(*) INTO v_mismatch_count
  FROM tmp_proposed_settlements p
  JOIN public.settlement_payments sp ON sp.idempotency_key = p.idempotency_key
  WHERE sp.trip_id IS DISTINCT FROM p.trip_id
     OR sp.payer_id IS DISTINCT FROM p.payer_id
     OR sp.recipient_id IS DISTINCT FROM p.recipient_id
     OR sp.currency IS DISTINCT FROM p.currency
     OR round(sp.amount, 2) IS DISTINCT FROM round(p.net_amount, 2)
     OR sp.status IS DISTINCT FROM 'settled';

  IF v_mismatch_count > 0 THEN
    RAISE EXCEPTION 'Existing settlement_payments rows conflict with % proposed idempotency key(s)', v_mismatch_count;
  END IF;
END;
$guard_preexisting_match$;

INSERT INTO public.settlement_payments (
  trip_id, payer_id, recipient_id, amount, currency, status,
  idempotency_key, confirmed_by, confirmed_at, created_by, created_at, updated_at
)
SELECT
  p.trip_id, p.payer_id, p.recipient_id, p.net_amount, p.currency, 'settled',
  p.idempotency_key, p.recipient_id, p.latest_paid_at, p.recipient_id, p.latest_paid_at, p.latest_paid_at
FROM tmp_proposed_settlements p
ON CONFLICT (idempotency_key) DO NOTHING;

-- amount_applied uses the settlement currency: converted home currency when
-- configured, otherwise the original expense currency.
INSERT INTO public.settlement_payment_expenses (
  settlement_payment_id, expense_participant_id, amount_applied
)
SELECT
  sp.id,
  e.expense_participant_id,
  e.converted_amount
FROM tmp_proposed_settlements p
JOIN public.settlement_payments sp ON sp.idempotency_key = p.idempotency_key
JOIN tmp_eligible_participants e
  ON e.trip_id = p.trip_id
  AND e.settlement_currency = p.currency
  AND LEAST(e.debtor_id, e.creditor_id) = LEAST(p.payer_id, p.recipient_id)
  AND GREATEST(e.debtor_id, e.creditor_id) = GREATEST(p.payer_id, p.recipient_id)
ON CONFLICT (settlement_payment_id, expense_participant_id) DO NOTHING;

-- Every linked expense_participant must belong to either the
-- settlement's payer or recipient.
DO $guard_participant_membership$
DECLARE
  v_bad_count integer;
BEGIN
  SELECT count(*) INTO v_bad_count
  FROM public.settlement_payments sp
  JOIN public.settlement_payment_expenses spe ON spe.settlement_payment_id = sp.id
  JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
  WHERE sp.idempotency_key IN (SELECT idempotency_key FROM tmp_proposed_settlements)
    AND ep.user_id <> sp.payer_id
    AND ep.user_id <> sp.recipient_id;

  IF v_bad_count > 0 THEN
    RAISE EXCEPTION 'Found % expense_participant_id(s) linked to migration settlements that belong to neither the payer nor the recipient', v_bad_count;
  END IF;
END;
$guard_participant_membership$;

-- Post-insert net invariant: payer-side minus recipient-side allocations must
-- equal the settlement's stored amount for every proposed key.
DO $guard_invariant$
DECLARE
  v_bad_count integer;
BEGIN
  SELECT count(*) INTO v_bad_count
  FROM (
    SELECT sp.id, sp.amount,
      COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.payer_id), 0)
      - COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.recipient_id), 0) AS computed_net
    FROM public.settlement_payments sp
    JOIN public.settlement_payment_expenses spe ON spe.settlement_payment_id = sp.id
    JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
    WHERE sp.idempotency_key IN (SELECT idempotency_key FROM tmp_proposed_settlements)
    GROUP BY sp.id, sp.amount
    HAVING round(
      COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.payer_id), 0)
      - COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.recipient_id), 0), 2
    ) <> round(sp.amount, 2)
  ) mismatches;

  IF v_bad_count > 0 THEN
    RAISE EXCEPTION 'Net allocation invariant failed for % settlement(s)', v_bad_count;
  END IF;
END;
$guard_invariant$;

COMMIT;
