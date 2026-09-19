-- Read-only preview for repairing v4 migration settlements that used a
-- foreign currency while the trip has a configured home currency.
-- No database data is modified by this file.

WITH identified_v4 AS (
  SELECT
    sp.id AS settlement_payment_id,
    sp.trip_id,
    sp.currency AS payment_currency,
    sp.payer_id,
    sp.recipient_id,
    sp.amount,
    sp.idempotency_key,
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
),
legacy_allocations AS (
  SELECT
    v.*,
    spe.expense_participant_id,
    spe.amount_applied AS old_amount_applied,
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
  FROM identified_v4 v
  JOIN public.settlement_payment_expenses spe
    ON spe.settlement_payment_id = v.settlement_payment_id
  JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
  JOIN public.trip_expenses te ON te.id = ep.expense_id
),
prepared AS (
  SELECT
    a.*,
    CASE
      WHEN a.original_currency = a.home_currency THEN a.amount_settled
      WHEN a.converted_amount_home IS NOT NULL
        AND a.expense_amount > 0
        AND UPPER(COALESCE(a.expense_home_currency, '')) = a.home_currency
        THEN ROUND((a.amount_settled / a.expense_amount) * a.converted_amount_home, 2)
      WHEN a.fx_rate_to_home IS NOT NULL
        AND a.fx_rate_to_home > 0
        AND UPPER(COALESCE(a.expense_home_currency, '')) = a.home_currency
        THEN ROUND(a.amount_settled * a.fx_rate_to_home, 2)
      ELSE NULL
    END AS corrected_home_amount,
    CASE
      WHEN a.original_currency = a.home_currency THEN 'same_currency'
      WHEN a.converted_amount_home IS NOT NULL
        AND a.expense_amount > 0
        AND UPPER(COALESCE(a.expense_home_currency, '')) = a.home_currency
        THEN 'converted_amount_snapshot'
      WHEN a.fx_rate_to_home IS NOT NULL
        AND a.fx_rate_to_home > 0
        AND UPPER(COALESCE(a.expense_home_currency, '')) = a.home_currency
        THEN 'fx_rate_snapshot'
      ELSE 'no_reliable_conversion'
    END AS correction_source
  FROM legacy_allocations a
)
SELECT
  settlement_payment_id,
  trip_id,
  payment_currency AS incorrect_payment_currency,
  home_currency,
  COUNT(*) AS participant_count,
  COUNT(*) FILTER (WHERE corrected_home_amount IS NOT NULL) AS repairable_participants,
  COUNT(*) FILTER (WHERE corrected_home_amount IS NULL) AS unresolved_participants,
  ARRAY_AGG(DISTINCT correction_source ORDER BY correction_source) AS correction_sources,
  ROUND(SUM(COALESCE(corrected_home_amount, 0)), 2) AS repairable_home_amount
FROM prepared
GROUP BY settlement_payment_id, trip_id, payment_currency, home_currency
ORDER BY trip_id, settlement_payment_id;

WITH identified_v4 AS (
  SELECT sp.id AS settlement_payment_id, sp.trip_id, sp.currency,
         recipient_profile.home_currency, sp.payer_id, sp.recipient_id
  FROM public.settlement_payments sp
  JOIN public.profiles recipient_profile ON recipient_profile.id = sp.recipient_id
  CROSS JOIN LATERAL (
    SELECT md5('legacy-settlement-migration:v4:' || sp.trip_id || ':' || sp.currency || ':' || sp.payer_id || ':' || sp.recipient_id) AS h
  ) x
  WHERE UPPER(NULLIF(TRIM(recipient_profile.home_currency), '')) ~ '^[A-Z]{3}$'
    AND sp.currency <> UPPER(NULLIF(TRIM(recipient_profile.home_currency), ''))
    AND sp.idempotency_key = (
      substr(x.h, 1, 8) || '-' || substr(x.h, 9, 4) || '-' ||
      substr(x.h, 13, 4) || '-' || substr(x.h, 17, 4) || '-' || substr(x.h, 21, 12)
    )::uuid
),
rows AS (
  SELECT v.*, ep.amount_settled, te.currency AS original_currency,
    te.amount AS expense_amount, te.fx_rate_to_home,
    te.converted_amount_home, te.home_currency AS expense_home_currency
  FROM identified_v4 v
  JOIN public.settlement_payment_expenses spe ON spe.settlement_payment_id = v.settlement_payment_id
  JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
  JOIN public.trip_expenses te ON te.id = ep.expense_id
),
classified AS (
  SELECT *,
    CASE
      WHEN original_currency = home_currency THEN amount_settled
      WHEN converted_amount_home IS NOT NULL AND expense_amount > 0
        AND UPPER(COALESCE(expense_home_currency, '')) = home_currency
        THEN ROUND((amount_settled / expense_amount) * converted_amount_home, 2)
      WHEN fx_rate_to_home IS NOT NULL AND fx_rate_to_home > 0
        AND UPPER(COALESCE(expense_home_currency, '')) = home_currency
        THEN ROUND(amount_settled * fx_rate_to_home, 2)
      ELSE NULL
    END AS corrected_home_amount
  FROM rows
)
SELECT 'bad_v4_payments' AS metric, COUNT(DISTINCT settlement_payment_id)::numeric AS value FROM classified
UNION ALL
SELECT 'affected_participants', COUNT(*)::numeric FROM classified
UNION ALL
SELECT 'repairable_participants', COUNT(*)::numeric FROM classified WHERE corrected_home_amount IS NOT NULL
UNION ALL
SELECT 'unresolved_participants', COUNT(*)::numeric FROM classified WHERE corrected_home_amount IS NULL
UNION ALL
SELECT 'repairable_trips', COUNT(DISTINCT trip_id)::numeric FROM classified WHERE corrected_home_amount IS NOT NULL
ORDER BY metric;
