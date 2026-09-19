-- READ-ONLY preview for recipient-profile-currency settlement migration.
-- No database changes and no live/current FX calls.
-- Existing linked participants are excluded from proposals and reported separately.
-- A participant's recipient is the largest expense_payment user, falling back
-- to trip_expenses.created_by, matching the existing migration logic.

WITH trip_currency AS (
  SELECT
    t.id AS trip_id,
    UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''),
                   NULLIF(TRIM(t.currency_settings ->> 'home_currency'), ''))) AS trip_home_currency
  FROM public.trips t
),
resolved AS (
  SELECT
    ep.id AS expense_participant_id,
    ep.expense_id,
    ep.user_id AS payer_id,
    ep.amount_settled,
    ep.paid_at,
    te.trip_id,
    UPPER(COALESCE(NULLIF(TRIM(te.original_currency), ''), NULLIF(TRIM(te.currency), ''))) AS expense_currency,
    te.amount AS expense_amount,
    te.converted_amount_home,
    te.fx_rate_to_home,
    UPPER(NULLIF(TRIM(te.home_currency), '')) AS expense_snapshot_home_currency,
    COALESCE(
      (SELECT epay.user_id
       FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id
       LIMIT 1),
      te.created_by
    ) AS recipient_id,
    tc.trip_home_currency,
    UPPER(NULLIF(TRIM(recipient_profile.home_currency), '')) AS recipient_home_currency,
    EXISTS (
      SELECT 1
      FROM public.settlement_payment_expenses spe
      WHERE spe.expense_participant_id = ep.id
    ) AS already_linked
  FROM public.expense_participants ep
  JOIN public.trip_expenses te ON te.id = ep.expense_id
  JOIN trip_currency tc ON tc.trip_id = te.trip_id
  LEFT JOIN public.profiles recipient_profile
    ON recipient_profile.id = COALESCE(
      (SELECT epay.user_id
       FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id
       LIMIT 1),
      te.created_by
    )
  WHERE ep.is_paid = true
    AND ep.amount_settled > 0
    AND ep.paid_at IS NOT NULL
),
classified AS (
  SELECT
    r.*,
    CASE
      WHEN r.recipient_home_currency IS NULL
        OR r.recipient_home_currency !~ '^[A-Z]{3}$' THEN NULL
      WHEN r.expense_currency = r.recipient_home_currency
        THEN r.amount_settled
      WHEN r.converted_amount_home IS NOT NULL
        AND r.expense_amount > 0
        AND r.expense_snapshot_home_currency = r.recipient_home_currency
        THEN ROUND((r.amount_settled / r.expense_amount) * r.converted_amount_home, 2)
      WHEN r.fx_rate_to_home IS NOT NULL
        AND r.fx_rate_to_home > 0
        AND r.expense_snapshot_home_currency = r.recipient_home_currency
        THEN ROUND(r.amount_settled * r.fx_rate_to_home, 2)
      ELSE NULL
    END AS converted_amount,
    CASE
      WHEN r.already_linked THEN 'ALREADY_LINKED_NOT_MIGRATED'
      WHEN r.recipient_home_currency IS NULL
        OR r.recipient_home_currency !~ '^[A-Z]{3}$' THEN 'MISSING_RECIPIENT_HOME_CURRENCY'
      WHEN r.expense_currency = r.recipient_home_currency THEN 'SAME_CURRENCY'
      WHEN r.converted_amount_home IS NOT NULL
        AND r.expense_amount > 0
        AND r.expense_snapshot_home_currency = r.recipient_home_currency THEN 'HISTORICAL_CONVERTED_AMOUNT'
      WHEN r.fx_rate_to_home IS NOT NULL
        AND r.fx_rate_to_home > 0
        AND r.expense_snapshot_home_currency = r.recipient_home_currency THEN 'HISTORICAL_FX_RATE'
      ELSE 'CONVERSION_UNAVAILABLE'
    END AS conversion_classification
  FROM resolved r
),
eligible AS (
  SELECT *
  FROM classified
  WHERE NOT already_linked
    AND recipient_id IS NOT NULL
    AND payer_id <> recipient_id
    AND converted_amount IS NOT NULL
),
pair_totals AS (
  SELECT
    trip_id,
    recipient_home_currency AS settlement_currency,
    LEAST(payer_id, recipient_id) AS person_a,
    GREATEST(payer_id, recipient_id) AS person_b,
    COALESCE(SUM(converted_amount) FILTER (WHERE payer_id = LEAST(payer_id, recipient_id)), 0) AS a_to_b_gross,
    COALESCE(SUM(converted_amount) FILTER (WHERE payer_id = GREATEST(payer_id, recipient_id)), 0) AS b_to_a_gross,
    COUNT(*) AS participant_count
  FROM eligible
  GROUP BY trip_id, recipient_home_currency,
           LEAST(payer_id, recipient_id), GREATEST(payer_id, recipient_id)
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

-- Conversion and migration summary.
WITH classified AS (
  SELECT *
  FROM (
    SELECT
      ep.id AS expense_participant_id,
      ep.user_id AS payer_id,
      ep.amount_settled,
      te.trip_id,
      UPPER(COALESCE(NULLIF(TRIM(te.original_currency), ''), NULLIF(TRIM(te.currency), ''))) AS expense_currency,
      te.amount AS expense_amount,
      te.converted_amount_home,
      te.fx_rate_to_home,
      UPPER(NULLIF(TRIM(te.home_currency), '')) AS expense_snapshot_home_currency,
      COALESCE(
        (SELECT epay.user_id FROM public.expense_payments epay
         WHERE epay.expense_id = te.id
         ORDER BY epay.amount_paid DESC, epay.user_id LIMIT 1),
        te.created_by
      ) AS recipient_id,
      UPPER(NULLIF(TRIM(recipient_profile.home_currency), '')) AS recipient_home_currency,
      EXISTS (
        SELECT 1 FROM public.settlement_payment_expenses spe
        WHERE spe.expense_participant_id = ep.id
      ) AS already_linked
    FROM public.expense_participants ep
    JOIN public.trip_expenses te ON te.id = ep.expense_id
    LEFT JOIN public.profiles recipient_profile ON recipient_profile.id = COALESCE(
      (SELECT epay.user_id FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id LIMIT 1),
      te.created_by
    )
    WHERE ep.is_paid = true AND ep.amount_settled > 0 AND ep.paid_at IS NOT NULL
  ) r
),
status_counts AS (
  SELECT
    CASE
      WHEN already_linked THEN 'ALREADY_LINKED_NOT_MIGRATED'
      WHEN recipient_home_currency IS NULL OR recipient_home_currency !~ '^[A-Z]{3}$' THEN 'MISSING_RECIPIENT_HOME_CURRENCY'
      WHEN expense_currency = recipient_home_currency THEN 'SAME_CURRENCY'
      WHEN converted_amount_home IS NOT NULL AND expense_amount > 0
        AND expense_snapshot_home_currency = recipient_home_currency THEN 'HISTORICAL_CONVERTED_AMOUNT'
      WHEN fx_rate_to_home IS NOT NULL AND fx_rate_to_home > 0
        AND expense_snapshot_home_currency = recipient_home_currency THEN 'HISTORICAL_FX_RATE'
      ELSE 'CONVERSION_UNAVAILABLE'
    END AS classification
  FROM classified
)
SELECT classification, COUNT(*)::numeric AS participant_count
FROM status_counts
GROUP BY classification
ORDER BY classification;

-- Existing linked settlement payments: report target-currency mismatches only;
-- do not modify them.
SELECT
  sp.id AS settlement_payment_id,
  sp.trip_id,
  sp.recipient_id,
  UPPER(NULLIF(TRIM(sp.currency), '')) AS settlement_currency,
  UPPER(NULLIF(TRIM(recipient_profile.home_currency), '')) AS recipient_home_currency,
  sp.amount,
  sp.status,
  CASE
    WHEN UPPER(NULLIF(TRIM(sp.currency), '')) = UPPER(NULLIF(TRIM(recipient_profile.home_currency), ''))
      THEN 'ALREADY_LINKED_CORRECT_RECIPIENT_CURRENCY'
    ELSE 'ALREADY_LINKED_DIFFERENT_RECIPIENT_CURRENCY'
  END AS linked_classification
FROM public.settlement_payments sp
LEFT JOIN public.profiles recipient_profile ON recipient_profile.id = sp.recipient_id
WHERE UPPER(NULLIF(TRIM(sp.currency), '')) IS DISTINCT FROM
      UPPER(NULLIF(TRIM(recipient_profile.home_currency), ''))
ORDER BY sp.trip_id, sp.created_at, sp.id;
