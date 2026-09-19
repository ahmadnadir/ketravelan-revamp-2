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
    COALESCE(
      (SELECT epay.user_id FROM public.expense_payments epay
       WHERE epay.expense_id = te.id
       ORDER BY epay.amount_paid DESC, epay.user_id LIMIT 1),
      te.created_by
    ) AS creditor_id,
    EXISTS (
      SELECT 1 FROM public.settlement_payment_expenses spe
      WHERE spe.expense_participant_id = ep.id
    ) AS already_linked
  FROM public.expense_participants ep
  JOIN public.trip_expenses te ON te.id = ep.expense_id
  WHERE te.trip_id = 'c45d9971-2a22-48ec-b9f5-97d313078988'
    AND ep.is_paid = true
    AND ep.amount_settled > 0
    AND ep.paid_at IS NOT NULL
),
flagged AS (
  SELECT *,
    (creditor_id IS NULL) AS missing_recipient,
    (original_currency IS NULL OR original_currency !~ '^[A-Z]{3}$') AS invalid_currency,
    (creditor_id IS NOT NULL AND debtor_id = creditor_id) AS self_settlement
  FROM candidate
),
-- Verification recomputes the SAME pool the migration selected from, so it
-- deliberately does NOT exclude already-linked rows here: after a successful
-- migration, all 47 participants are expected to be linked. Excluding them
-- would make "expected" empty and produce a false "0 rows" verification result.
eligible AS (
  SELECT * FROM flagged
  WHERE NOT missing_recipient AND NOT invalid_currency AND NOT self_settlement
),
trip_home AS (
  SELECT
    id AS trip_id,
    UPPER(COALESCE(NULLIF(TRIM(home_currency), ''), NULLIF(TRIM(currency_settings ->> 'home_currency'), ''))) AS home_currency
  FROM public.trips
  WHERE id = 'c45d9971-2a22-48ec-b9f5-97d313078988'
),
converted AS (
  SELECT
    e.debtor_id, e.creditor_id, e.trip_id, th.home_currency,
    CASE
      WHEN e.original_currency = th.home_currency THEN e.amount_settled
      WHEN e.converted_amount_home IS NOT NULL
        AND e.expense_amount > 0
        AND UPPER(COALESCE(e.expense_home_currency, '')) = th.home_currency
        THEN ROUND((e.amount_settled / e.expense_amount) * e.converted_amount_home, 2)
      ELSE NULL
    END AS converted_amount
  FROM eligible e
  CROSS JOIN trip_home th
),
pair_direction AS (
  SELECT
    trip_id, home_currency,
    LEAST(debtor_id, creditor_id) AS person_a, GREATEST(debtor_id, creditor_id) AS person_b,
    debtor_id, creditor_id, converted_amount
  FROM converted
),
pair_totals AS (
  SELECT
    trip_id, home_currency, person_a, person_b,
    COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = person_a), 0) AS a_to_b_gross,
    COALESCE(SUM(converted_amount) FILTER (WHERE debtor_id = person_b), 0) AS b_to_a_gross
  FROM pair_direction
  GROUP BY trip_id, home_currency, person_a, person_b
),
expected AS (
  SELECT
    trip_id, home_currency AS currency,
    CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END AS payer_id,
    CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END AS recipient_id,
    ROUND(ABS(a_to_b_gross - b_to_a_gross)::numeric, 2) AS expected_net_amount,
    (
      substr(md5('legacy-settlement-migration:v2-home-currency:' || trip_id || ':' || home_currency || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 1, 8) || '-' ||
      substr(md5('legacy-settlement-migration:v2-home-currency:' || trip_id || ':' || home_currency || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 9, 4) || '-' ||
      substr(md5('legacy-settlement-migration:v2-home-currency:' || trip_id || ':' || home_currency || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 13, 4) || '-' ||
      substr(md5('legacy-settlement-migration:v2-home-currency:' || trip_id || ':' || home_currency || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 17, 4) || '-' ||
      substr(md5('legacy-settlement-migration:v2-home-currency:' || trip_id || ':' || home_currency || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_a ELSE person_b END) || ':' ||
        (CASE WHEN a_to_b_gross >= b_to_a_gross THEN person_b ELSE person_a END)), 21, 12)
    )::uuid AS idempotency_key
  FROM pair_totals
  WHERE ROUND(ABS(a_to_b_gross - b_to_a_gross)::numeric, 2) > 0
)

-- 1. All 3 migration settlements with expected vs actual (with payer/recipient usernames)
SELECT
  sp.id, sp.trip_id, sp.currency,
  sp.payer_id, payer.username AS payer_username, payer.full_name AS payer_full_name,
  sp.recipient_id, recipient.username AS recipient_username, recipient.full_name AS recipient_full_name,
  sp.amount,
  ex.expected_net_amount, (sp.amount = ex.expected_net_amount) AS amount_matches,
  sp.status, sp.idempotency_key,
  count(spe.id) AS linked_expense_participant_count,
  sum(spe.amount_applied) AS sum_amount_applied
FROM expected ex
JOIN public.settlement_payments sp ON sp.idempotency_key = ex.idempotency_key
LEFT JOIN public.settlement_payment_expenses spe ON spe.settlement_payment_id = sp.id
LEFT JOIN public.profiles payer ON payer.id = sp.payer_id
LEFT JOIN public.profiles recipient ON recipient.id = sp.recipient_id
GROUP BY sp.id, sp.trip_id, sp.currency, sp.payer_id, payer.username, payer.full_name,
         sp.recipient_id, recipient.username, recipient.full_name, sp.amount,
         ex.expected_net_amount, sp.status, sp.idempotency_key
ORDER BY sp.amount DESC;

-- 2. Row count: must be exactly 3
SELECT count(*) AS migration_settlement_count
FROM public.settlement_payments
WHERE idempotency_key IN (SELECT idempotency_key FROM expected);

-- 3. Currency check: must all be MYR
SELECT currency, count(*) FROM public.settlement_payments
WHERE idempotency_key IN (SELECT idempotency_key FROM expected)
GROUP BY currency;

-- 4. Net invariant per settlement
SELECT
  sp.id, sp.payer_id, sp.recipient_id, sp.amount,
  round(
    COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.payer_id), 0)
    - COALESCE(SUM(spe.amount_applied) FILTER (WHERE ep.user_id = sp.recipient_id), 0), 2
  ) AS computed_net
FROM public.settlement_payments sp
JOIN public.settlement_payment_expenses spe ON spe.settlement_payment_id = sp.id
JOIN public.expense_participants ep ON ep.id = spe.expense_participant_id
WHERE sp.idempotency_key IN (SELECT idempotency_key FROM expected)
GROUP BY sp.id, sp.payer_id, sp.recipient_id, sp.amount;

-- 5. No orphan/other settlements exist for this trip beyond the 3 migration rows
SELECT count(*) AS other_settlements_in_trip
FROM public.settlement_payments
WHERE trip_id = 'c45d9971-2a22-48ec-b9f5-97d313078988'
  AND idempotency_key NOT IN (SELECT idempotency_key FROM expected);

-- 6. Idempotency re-run safety: running migration.sql again must not add rows.
-- (Run migration.sql a second time, then re-run query #2 above — must still be 3.)
