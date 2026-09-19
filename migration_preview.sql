-- Read-only preview for the repo-wide legacy settlement migration.
-- This file contains SELECT statements only and does not modify database data.

WITH candidate AS (
  SELECT
    ep.id AS expense_participant_id,
    ep.user_id AS debtor_id,
    ep.amount_settled,
    te.trip_id,
    te.currency AS original_currency,
    te.amount AS expense_amount,
    te.converted_amount_home,
    te.home_currency AS expense_home_currency,
    COALESCE(
      (SELECT epay.user_id
       FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id
       LIMIT 1),
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
    END AS trip_home_currency,
    ep.paid_at
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
),
prepared AS (
  SELECT
    f.*,
    NOT f.already_linked
      AND NOT f.missing_recipient
      AND NOT f.invalid_currency
      AND NOT f.self_settlement AS eligible,
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
  FROM flagged f
),
pair_totals AS (
  SELECT
    trip_id,
    settlement_currency,
    LEAST(debtor_id, creditor_id) AS person_a,
    GREATEST(debtor_id, creditor_id) AS person_b,
    COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = LEAST(debtor_id, creditor_id)), 0) AS a_to_b_gross,
    COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = GREATEST(debtor_id, creditor_id)), 0) AS b_to_a_gross,
    COUNT(*) AS participant_count
  FROM prepared
  WHERE eligible
    AND converted_amount IS NOT NULL
  GROUP BY trip_id, settlement_currency, LEAST(debtor_id, creditor_id), GREATEST(debtor_id, creditor_id)
)
SELECT
  trip_id,
  settlement_currency,
  CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END AS payer_id,
  CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END AS recipient_id,
  ROUND(a_to_b_gross, 2) AS gross_payer_side,
  ROUND(b_to_a_gross, 2) AS gross_reverse_side,
  ROUND(ABS(a_to_b_gross - b_to_a_gross), 2) AS final_net_amount,
  participant_count
FROM pair_totals
WHERE ROUND(ABS(a_to_b_gross - b_to_a_gross), 2) > 0
ORDER BY trip_id, settlement_currency, payer_id, recipient_id;

WITH candidate AS (
  SELECT
    ep.id AS expense_participant_id,
    ep.user_id AS debtor_id,
    ep.amount_settled,
    te.trip_id,
    te.currency AS original_currency,
    te.amount AS expense_amount,
    te.converted_amount_home,
    te.home_currency AS expense_home_currency,
    COALESCE(
      (SELECT epay.user_id
       FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id
       LIMIT 1),
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
),
prepared AS (
  SELECT
    f.*,
    NOT f.already_linked
      AND NOT f.missing_recipient
      AND NOT f.invalid_currency
      AND NOT f.self_settlement AS eligible,
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
  FROM flagged f
),
proposed AS (
  SELECT
    trip_id,
    settlement_currency,
    LEAST(debtor_id, creditor_id) AS person_a,
    GREATEST(debtor_id, creditor_id) AS person_b,
    ROUND(ABS(
      COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = LEAST(debtor_id, creditor_id)), 0)
      - COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = GREATEST(debtor_id, creditor_id)), 0)
    ), 2) AS net_amount
  FROM prepared
  WHERE eligible
    AND converted_amount IS NOT NULL
  GROUP BY trip_id, settlement_currency,
           LEAST(debtor_id, creditor_id), GREATEST(debtor_id, creditor_id)
  HAVING ROUND(ABS(
    COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = LEAST(debtor_id, creditor_id)), 0)
    - COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = GREATEST(debtor_id, creditor_id)), 0)
  ), 2) > 0
)
SELECT 'trips_affected' AS metric, COUNT(DISTINCT trip_id)::numeric AS value FROM proposed
UNION ALL
SELECT 'eligible_participants', COUNT(*)::numeric
FROM prepared
WHERE eligible AND converted_amount IS NOT NULL
UNION ALL
SELECT 'proposed_settlements', COUNT(*)::numeric FROM proposed
UNION ALL
SELECT 'original_currency_fallback_with_trip_home', COUNT(*)::numeric
FROM prepared
WHERE eligible
  AND trip_home_currency IS NOT NULL
  AND original_currency <> trip_home_currency
  AND NOT (
    converted_amount_home IS NOT NULL
    AND expense_amount > 0
    AND UPPER(COALESCE(expense_home_currency, '')) = trip_home_currency
  )
UNION ALL
SELECT 'already_migrated_or_excluded', COUNT(*)::numeric
FROM prepared
WHERE already_linked
UNION ALL
SELECT 'self_settlements_excluded', COUNT(*)::numeric
FROM prepared
WHERE self_settlement AND NOT already_linked
UNION ALL
SELECT 'invalid_or_missing_currency', COUNT(*)::numeric
FROM prepared
WHERE invalid_currency AND NOT already_linked
UNION ALL
SELECT 'missing_historical_conversion_with_trip_home', COUNT(*)::numeric
FROM prepared
WHERE trip_home_currency IS NOT NULL
  AND converted_amount IS NULL
  AND NOT already_linked
  AND NOT missing_recipient
  AND NOT invalid_currency
  AND NOT self_settlement
ORDER BY metric;
