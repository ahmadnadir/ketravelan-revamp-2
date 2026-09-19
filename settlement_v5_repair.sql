-- Corrects only v4 migration-created settlement payments whose currency is
-- foreign to the recipient's profile home currency.
--
-- This script preserves expense_participants and all non-v4 settlements.
-- It uses only historical converted_amount_home or fx_rate_to_home data.
-- Run settlement_v5_preview.sql first. This file is intentionally not executed
-- by the coding agent.

BEGIN;

CREATE TEMP TABLE tmp_bad_v4_payments ON COMMIT DROP AS
WITH identified_v4 AS (
  SELECT
  sp.id AS settlement_payment_id,
  sp.trip_id,
  sp.currency AS payment_currency,
  sp.payer_id,
  sp.recipient_id,
  UPPER(NULLIF(TRIM(recipient_profile.home_currency), '')) AS home_currency
  FROM public.settlement_payments sp
  JOIN public.profiles recipient_profile ON recipient_profile.id = sp.recipient_id
CROSS JOIN LATERAL (
  SELECT md5(
    'legacy-settlement-migration:v4:' || sp.trip_id || ':' || sp.currency || ':' ||
    sp.payer_id || ':' || sp.recipient_id
  ) AS hash_value
) h
CROSS JOIN LATERAL (
  SELECT (
    substr(h.hash_value, 1, 8) || '-' || substr(h.hash_value, 9, 4) || '-' ||
    substr(h.hash_value, 13, 4) || '-' || substr(h.hash_value, 17, 4) || '-' ||
    substr(h.hash_value, 21, 12)
  )::uuid AS expected_key
) k
  WHERE UPPER(NULLIF(TRIM(recipient_profile.home_currency), '')) ~ '^[A-Z]{3}$'
    AND sp.currency <> UPPER(NULLIF(TRIM(recipient_profile.home_currency), ''))
    AND sp.idempotency_key = k.expected_key
)
SELECT * FROM identified_v4;

CREATE TEMP TABLE tmp_bad_v4_allocations ON COMMIT DROP AS
WITH source_rows AS (
  SELECT
    b.settlement_payment_id,
    b.trip_id,
    b.home_currency,
    spe.expense_participant_id,
    ep.user_id AS debtor_id,
    ep.amount_settled,
    te.id AS expense_id,
    te.currency AS original_currency,
    te.amount AS expense_amount,
    te.fx_rate_to_home,
    te.converted_amount_home,
    te.home_currency AS expense_home_currency,
    ep.paid_at,
    COALESCE(
      (SELECT epay.user_id
       FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id
       LIMIT 1),
      te.created_by
    ) AS creditor_id
  FROM tmp_bad_v4_payments b
  JOIN public.settlement_payment_expenses spe
    ON spe.settlement_payment_id = b.settlement_payment_id
  JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
  JOIN public.trip_expenses te ON te.id = ep.expense_id
)
SELECT
  s.*,
  CASE
    WHEN s.original_currency = s.home_currency THEN s.amount_settled
    WHEN s.converted_amount_home IS NOT NULL
      AND s.expense_amount > 0
      AND UPPER(COALESCE(s.expense_home_currency, '')) = s.home_currency
      THEN ROUND((s.amount_settled / s.expense_amount) * s.converted_amount_home, 2)
    WHEN s.fx_rate_to_home IS NOT NULL
      AND s.fx_rate_to_home > 0
      AND UPPER(COALESCE(s.expense_home_currency, '')) = s.home_currency
      THEN ROUND(s.amount_settled * s.fx_rate_to_home, 2)
    ELSE NULL
  END AS corrected_home_amount
FROM source_rows s;

CREATE TEMP TABLE tmp_v5_proposed_settlements ON COMMIT DROP AS
WITH eligible AS (
  SELECT *
  FROM tmp_bad_v4_allocations
  WHERE corrected_home_amount IS NOT NULL
    AND creditor_id IS NOT NULL
    AND debtor_id <> creditor_id
),
pair_totals AS (
  SELECT
    trip_id,
    home_currency AS currency,
    LEAST(debtor_id, creditor_id) AS person_a,
    GREATEST(debtor_id, creditor_id) AS person_b,
    COALESCE(SUM(corrected_home_amount) FILTER (WHERE debtor_id = LEAST(debtor_id, creditor_id)), 0) AS a_to_b_gross,
    COALESCE(SUM(corrected_home_amount) FILTER (WHERE debtor_id = GREATEST(debtor_id, creditor_id)), 0) AS b_to_a_gross,
    MAX(paid_at) AS latest_paid_at
  FROM eligible
  GROUP BY trip_id, home_currency, LEAST(debtor_id, creditor_id), GREATEST(debtor_id, creditor_id)
),
netted AS (
  SELECT
    trip_id,
    currency,
    CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END AS payer_id,
    CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END AS recipient_id,
    ROUND(ABS(a_to_b_gross - b_to_a_gross), 2) AS net_amount,
    latest_paid_at
  FROM pair_totals
  WHERE ROUND(ABS(a_to_b_gross - b_to_a_gross), 2) > 0
)
SELECT
  n.*,
  (
    substr(md5('legacy-settlement-migration:v5:' || n.trip_id || ':' || n.currency || ':' || n.payer_id || ':' || n.recipient_id), 1, 8) || '-' ||
    substr(md5('legacy-settlement-migration:v5:' || n.trip_id || ':' || n.currency || ':' || n.payer_id || ':' || n.recipient_id), 9, 4) || '-' ||
    substr(md5('legacy-settlement-migration:v5:' || n.trip_id || ':' || n.currency || ':' || n.payer_id || ':' || n.recipient_id), 13, 4) || '-' ||
    substr(md5('legacy-settlement-migration:v5:' || n.trip_id || ':' || n.currency || ':' || n.payer_id || ':' || n.recipient_id), 17, 4) || '-' ||
    substr(md5('legacy-settlement-migration:v5:' || n.trip_id || ':' || n.currency || ':' || n.payer_id || ':' || n.recipient_id), 21, 12)
  )::uuid AS idempotency_key
FROM netted n;

DO $guard_existing_v5$
DECLARE
  v_mismatch_count integer;
BEGIN
  SELECT count(*)
  INTO v_mismatch_count
  FROM tmp_v5_proposed_settlements p
  JOIN public.settlement_payments sp ON sp.idempotency_key = p.idempotency_key
  WHERE sp.trip_id IS DISTINCT FROM p.trip_id
     OR sp.payer_id IS DISTINCT FROM p.payer_id
     OR sp.recipient_id IS DISTINCT FROM p.recipient_id
     OR sp.currency IS DISTINCT FROM p.currency
     OR round(sp.amount, 2) IS DISTINCT FROM round(p.net_amount, 2)
     OR sp.status IS DISTINCT FROM 'settled';

  IF v_mismatch_count > 0 THEN
    RAISE EXCEPTION 'Existing v5 settlement conflict for % payment(s)', v_mismatch_count;
  END IF;
END;
$guard_existing_v5$;

-- Remove only repairable allocation links from the legacy payments. Unresolved
-- allocations remain attached to their original payment and are not guessed.
DELETE FROM public.settlement_payment_expenses spe
WHERE spe.settlement_payment_id IN (SELECT settlement_payment_id FROM tmp_bad_v4_payments)
  AND spe.expense_participant_id IN (
    SELECT expense_participant_id
    FROM tmp_bad_v4_allocations
    WHERE corrected_home_amount IS NOT NULL
  );

-- Preserve mixed payments by reducing their stored amount to the unresolved
-- legacy allocation balance before removing empty payment shells.
UPDATE public.settlement_payments sp
SET amount = remaining.remaining_amount,
    updated_at = now()
FROM (
  SELECT
    sp_inner.id,
    ROUND(ABS(
      COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp_inner.payer_id), 0)
      - COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp_inner.recipient_id), 0)
    ), 2) AS remaining_amount
  FROM public.settlement_payments sp_inner
  JOIN public.settlement_payment_expenses spe
    ON spe.settlement_payment_id = sp_inner.id
  JOIN public.expense_participants ep
    ON ep.id = spe.expense_participant_id
  WHERE sp_inner.id IN (SELECT settlement_payment_id FROM tmp_bad_v4_payments)
  GROUP BY sp_inner.id
) remaining
WHERE sp.id = remaining.id;

DELETE FROM public.settlement_payments sp
WHERE sp.id IN (SELECT settlement_payment_id FROM tmp_bad_v4_payments)
  AND NOT EXISTS (
    SELECT 1
    FROM public.settlement_payment_expenses spe
    WHERE spe.settlement_payment_id = sp.id
  );

INSERT INTO public.settlement_payments (
  trip_id, payer_id, recipient_id, amount, currency, status,
  idempotency_key, confirmed_by, confirmed_at, created_by, created_at, updated_at
)
SELECT
  p.trip_id,
  p.payer_id,
  p.recipient_id,
  p.net_amount,
  p.currency,
  'settled',
  p.idempotency_key,
  p.recipient_id,
  p.latest_paid_at,
  p.recipient_id,
  p.latest_paid_at,
  p.latest_paid_at
FROM tmp_v5_proposed_settlements p
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.settlement_payment_expenses (
  settlement_payment_id, expense_participant_id, amount_applied
)
SELECT
  sp.id,
  a.expense_participant_id,
  a.corrected_home_amount
FROM tmp_v5_proposed_settlements p
JOIN public.settlement_payments sp ON sp.idempotency_key = p.idempotency_key
JOIN tmp_bad_v4_allocations a
  ON a.trip_id = p.trip_id
 AND a.home_currency = p.currency
 AND a.corrected_home_amount IS NOT NULL
 AND a.creditor_id IS NOT NULL
 AND a.debtor_id <> a.creditor_id
 AND LEAST(a.debtor_id, a.creditor_id) = LEAST(p.payer_id, p.recipient_id)
 AND GREATEST(a.debtor_id, a.creditor_id) = GREATEST(p.payer_id, p.recipient_id)
ON CONFLICT (settlement_payment_id, expense_participant_id) DO NOTHING;

DO $guard_v5_invariant$
DECLARE
  v_bad_count integer;
BEGIN
  SELECT count(*)
  INTO v_bad_count
  FROM (
    SELECT
      sp.id,
      sp.amount,
      COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.payer_id), 0)
      - COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.recipient_id), 0) AS computed_net
    FROM public.settlement_payments sp
    JOIN public.settlement_payment_expenses spe ON spe.settlement_payment_id = sp.id
    JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
    WHERE sp.idempotency_key IN (SELECT idempotency_key FROM tmp_v5_proposed_settlements)
    GROUP BY sp.id, sp.amount
    HAVING round(
      COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.payer_id), 0)
      - COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.recipient_id), 0), 2
    ) <> round(sp.amount, 2)
  ) mismatches;

  IF v_bad_count > 0 THEN
    RAISE EXCEPTION 'v5 net allocation invariant failed for % settlement(s)', v_bad_count;
  END IF;
END;
$guard_v5_invariant$;

COMMIT;
