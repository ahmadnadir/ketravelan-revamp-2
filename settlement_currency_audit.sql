-- READ-ONLY settlement currency audit.
-- No INSERT, UPDATE, DELETE, DDL, migration, or FX lookup is performed.
-- Authoritative trip currency: trips.home_currency, with the synchronized
-- currency_settings->>'home_currency' compatibility fallback.
-- Active settlement system: settlement_payments and settlement_payment_expenses.
-- Legacy balance table: balance_settlements.

-- 1. Every settlement_payment with its linked allocation and expense trace.
WITH trip_currency AS (
  SELECT
    t.id AS trip_id,
    UPPER(COALESCE(
      NULLIF(TRIM(t.home_currency), ''),
      NULLIF(TRIM(t.currency_settings ->> 'home_currency'), '')
    )) AS trip_home_currency
  FROM public.trips t
),
settlement_rows AS (
  SELECT
    sp.id AS settlement_payment_id,
    sp.trip_id,
    tc.trip_home_currency,
    UPPER(NULLIF(TRIM(sp.currency), '')) AS settlement_currency,
    sp.payer_id,
    sp.recipient_id,
    sp.amount,
    sp.status,
    sp.created_at,
    sp.confirmed_at,
    sp.idempotency_key,
    spe.id AS settlement_payment_expense_id,
    spe.expense_participant_id,
    spe.amount_applied,
    ep.expense_id,
    ep.user_id AS participant_user_id,
    ep.amount_owed,
    ep.amount_settled,
    ep.is_paid,
    ep.paid_at,
    te.id AS trip_expense_id,
    UPPER(COALESCE(NULLIF(TRIM(te.original_currency), ''), NULLIF(TRIM(te.currency), ''))) AS expense_currency,
    te.amount AS expense_amount,
    te.converted_amount_home,
    te.fx_rate_to_home,
    te.home_currency AS expense_snapshot_home_currency,
    te.created_at AS expense_created_at,
    CASE
      WHEN tc.trip_home_currency IS NULL OR tc.trip_home_currency !~ '^[A-Z]{3}$'
        THEN 'INVALID/MISSING_HOME_CURRENCY'
      WHEN UPPER(NULLIF(TRIM(sp.currency), '')) IS NULL
        OR UPPER(NULLIF(TRIM(sp.currency), '')) !~ '^[A-Z]{3}$'
        THEN 'INVALID/MISSING_SETTLEMENT_CURRENCY'
      WHEN UPPER(NULLIF(TRIM(sp.currency), '')) = tc.trip_home_currency
        THEN 'MATCHES_HOME_CURRENCY'
      ELSE 'FOREIGN_SETTLEMENT_CURRENCY'
    END AS settlement_classification,
    CASE
      WHEN ep.id IS NULL THEN 'NO_EXPENSE_PARTICIPANT_LINK'
      WHEN ep.is_paid = true AND ep.amount_settled > 0 AND ep.paid_at IS NOT NULL
        AND UPPER(NULLIF(TRIM(sp.currency), '')) <> tc.trip_home_currency
        THEN 'ALREADY_LINKED_FOREIGN_CURRENCY'
      WHEN ep.is_paid = true AND ep.amount_settled > 0 AND ep.paid_at IS NOT NULL
        THEN 'ALREADY_MIGRATED_CORRECT_CURRENCY'
      ELSE NULL
    END AS linked_legacy_classification,
    CASE
      WHEN sp.payer_id = sp.recipient_id THEN 'SELF_SETTLEMENT'
      ELSE NULL
    END AS participant_classification,
    CASE
      WHEN UPPER(COALESCE(NULLIF(TRIM(te.original_currency), ''), NULLIF(TRIM(te.currency), ''))) = tc.trip_home_currency
        THEN 1::numeric
      WHEN te.converted_amount_home IS NOT NULL
        AND te.amount > 0
        AND UPPER(NULLIF(TRIM(te.home_currency), '')) = tc.trip_home_currency
        THEN te.converted_amount_home / te.amount
      WHEN te.fx_rate_to_home IS NOT NULL
        AND te.fx_rate_to_home > 0
        AND UPPER(NULLIF(TRIM(te.home_currency), '')) = tc.trip_home_currency
        THEN te.fx_rate_to_home
      ELSE NULL
    END AS historical_rate_to_trip_home
  FROM public.settlement_payments sp
  LEFT JOIN trip_currency tc ON tc.trip_id = sp.trip_id
  LEFT JOIN public.settlement_payment_expenses spe
    ON spe.settlement_payment_id = sp.id
  LEFT JOIN public.expense_participants ep
    ON ep.id = spe.expense_participant_id
  LEFT JOIN public.trip_expenses te
    ON te.id = ep.expense_id
)
SELECT *
FROM settlement_rows
ORDER BY settlement_classification, trip_id, settlement_payment_id, settlement_payment_expense_id;

-- 2. Every legacy settled participant: linked vs not linked, and whether any
-- linked settlement_payment uses a foreign currency.
WITH trip_currency AS (
  SELECT
    t.id AS trip_id,
    UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''),
                   NULLIF(TRIM(t.currency_settings ->> 'home_currency'), ''))) AS trip_home_currency
  FROM public.trips t
),
legacy_rows AS (
  SELECT
    ep.id AS expense_participant_id,
    ep.expense_id,
    ep.user_id AS participant_user_id,
    ep.amount_owed,
    ep.amount_settled,
    ep.is_paid,
    ep.paid_at,
    te.trip_id,
    UPPER(COALESCE(NULLIF(TRIM(te.original_currency), ''), NULLIF(TRIM(te.currency), ''))) AS expense_currency,
    te.amount AS expense_amount,
    te.converted_amount_home,
    te.fx_rate_to_home,
    te.home_currency AS expense_snapshot_home_currency,
    tc.trip_home_currency,
    spe.id AS settlement_payment_expense_id,
    spe.settlement_payment_id,
    UPPER(NULLIF(TRIM(sp.currency), '')) AS settlement_currency,
    sp.status AS settlement_status,
    CASE
      WHEN sp.id IS NULL THEN 'LEGACY_NOT_LINKED'
      WHEN ep.user_id = COALESCE(
        (SELECT epay.user_id
         FROM public.expense_payments epay
         WHERE epay.expense_id = te.id
         ORDER BY epay.amount_paid DESC, epay.user_id
         LIMIT 1),
        te.created_by
      ) THEN 'SELF_SETTLEMENT'
      WHEN tc.trip_home_currency IS NULL OR tc.trip_home_currency !~ '^[A-Z]{3}$'
        THEN 'INVALID/MISSING_HOME_CURRENCY'
      WHEN UPPER(NULLIF(TRIM(sp.currency), '')) IS NULL
        OR UPPER(NULLIF(TRIM(sp.currency), '')) !~ '^[A-Z]{3}$'
        THEN 'INVALID/MISSING_SETTLEMENT_CURRENCY'
      WHEN UPPER(NULLIF(TRIM(sp.currency), '')) = tc.trip_home_currency
        THEN 'ALREADY_MIGRATED_CORRECT_CURRENCY'
      ELSE 'ALREADY_LINKED_FOREIGN_CURRENCY'
    END AS classification,
    CASE
      WHEN UPPER(COALESCE(NULLIF(TRIM(te.original_currency), ''), NULLIF(TRIM(te.currency), ''))) = tc.trip_home_currency THEN 1::numeric
      WHEN te.converted_amount_home IS NOT NULL
        AND te.amount > 0
        AND UPPER(NULLIF(TRIM(te.home_currency), '')) = tc.trip_home_currency
        THEN te.converted_amount_home / te.amount
      WHEN te.fx_rate_to_home IS NOT NULL
        AND te.fx_rate_to_home > 0
        AND UPPER(NULLIF(TRIM(te.home_currency), '')) = tc.trip_home_currency
        THEN te.fx_rate_to_home
      ELSE NULL
    END AS historical_rate_to_trip_home
  FROM public.expense_participants ep
  JOIN public.trip_expenses te ON te.id = ep.expense_id
  LEFT JOIN trip_currency tc ON tc.trip_id = te.trip_id
  LEFT JOIN public.settlement_payment_expenses spe
    ON spe.expense_participant_id = ep.id
  LEFT JOIN public.settlement_payments sp
    ON sp.id = spe.settlement_payment_id
  WHERE ep.is_paid = true
    AND ep.amount_settled > 0
    AND ep.paid_at IS NOT NULL
)
SELECT *
FROM legacy_rows
ORDER BY classification, trip_id, expense_id, expense_participant_id, settlement_payment_id;

-- 3. Legacy balance_settlements audit. This is separate from the newer
-- settlement_payments system and may contain historical foreign currencies.
WITH trip_currency AS (
  SELECT
    t.id AS trip_id,
    UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''),
                   NULLIF(TRIM(t.currency_settings ->> 'home_currency'), ''))) AS trip_home_currency
  FROM public.trips t
)
SELECT
  bs.id AS balance_settlement_id,
  bs.trip_id,
  tc.trip_home_currency,
  UPPER(NULLIF(TRIM(bs.currency), '')) AS settlement_currency,
  bs.payer_id,
  bs.payee_id,
  bs.amount,
  bs.description,
  bs.settlement_date,
  bs.created_at,
  bs.created_by,
  CASE
    WHEN tc.trip_home_currency IS NULL OR tc.trip_home_currency !~ '^[A-Z]{3}$'
      THEN 'INVALID/MISSING_HOME_CURRENCY'
    WHEN UPPER(NULLIF(TRIM(bs.currency), '')) IS NULL
      OR UPPER(NULLIF(TRIM(bs.currency), '')) !~ '^[A-Z]{3}$'
      THEN 'INVALID/MISSING_SETTLEMENT_CURRENCY'
    WHEN UPPER(NULLIF(TRIM(bs.currency), '')) = tc.trip_home_currency
      THEN 'MATCHES_HOME_CURRENCY'
    ELSE 'FOREIGN_SETTLEMENT_CURRENCY'
  END AS classification
FROM public.balance_settlements bs
LEFT JOIN trip_currency tc ON tc.trip_id = bs.trip_id
ORDER BY classification, bs.trip_id, bs.id;

-- 4. Summary counts for the current settlement_payments system and legacy
-- settled participants. expense_payments is included as the source used to
-- resolve the historical creditor, but it is not itself a settlement record.
WITH trip_currency AS (
  SELECT
    t.id AS trip_id,
    UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''),
                   NULLIF(TRIM(t.currency_settings ->> 'home_currency'), ''))) AS trip_home_currency
  FROM public.trips t
),
settlements AS (
  SELECT
    sp.id,
    sp.trip_id,
    UPPER(NULLIF(TRIM(sp.currency), '')) AS settlement_currency,
    tc.trip_home_currency,
    CASE
      WHEN tc.trip_home_currency IS NULL OR tc.trip_home_currency !~ '^[A-Z]{3}$'
        THEN 'INVALID/MISSING_HOME_CURRENCY'
      WHEN UPPER(NULLIF(TRIM(sp.currency), '')) IS NULL
        OR UPPER(NULLIF(TRIM(sp.currency), '')) !~ '^[A-Z]{3}$'
        THEN 'INVALID/MISSING_SETTLEMENT_CURRENCY'
      WHEN UPPER(NULLIF(TRIM(sp.currency), '')) = tc.trip_home_currency
        THEN 'MATCHES_HOME_CURRENCY'
      ELSE 'FOREIGN_SETTLEMENT_CURRENCY'
    END AS classification
  FROM public.settlement_payments sp
  LEFT JOIN trip_currency tc ON tc.trip_id = sp.trip_id
),
legacy AS (
  SELECT
    ep.id,
    spe.settlement_payment_id,
    CASE WHEN spe.id IS NULL THEN 'LEGACY_NOT_LINKED' ELSE 'LEGACY_LINKED' END AS link_status
  FROM public.expense_participants ep
  LEFT JOIN public.settlement_payment_expenses spe
    ON spe.expense_participant_id = ep.id
  WHERE ep.is_paid = true
    AND ep.amount_settled > 0
    AND ep.paid_at IS NOT NULL
)
SELECT 'TOTAL_SETTLEMENT_PAYMENTS' AS metric, COUNT(*)::numeric AS value FROM settlements
UNION ALL
SELECT 'SETTLEMENT_PAYMENTS_MATCHING_HOME', COUNT(*)::numeric FROM settlements WHERE classification = 'MATCHES_HOME_CURRENCY'
UNION ALL
SELECT 'SETTLEMENT_PAYMENTS_FOREIGN_CURRENCY', COUNT(*)::numeric FROM settlements WHERE classification = 'FOREIGN_SETTLEMENT_CURRENCY'
UNION ALL
SELECT 'SETTLEMENT_PAYMENTS_INVALID_OR_MISSING_HOME', COUNT(*)::numeric FROM settlements WHERE classification = 'INVALID/MISSING_HOME_CURRENCY'
UNION ALL
SELECT 'SETTLEMENT_PAYMENTS_INVALID_OR_MISSING_CURRENCY', COUNT(*)::numeric FROM settlements WHERE classification = 'INVALID/MISSING_SETTLEMENT_CURRENCY'
UNION ALL
SELECT 'TOTAL_SETTLEMENT_PAYMENT_EXPENSES', COUNT(*)::numeric FROM public.settlement_payment_expenses
UNION ALL
SELECT 'LEGACY_SETTLED_ALREADY_LINKED', COUNT(*)::numeric FROM legacy WHERE link_status = 'LEGACY_LINKED'
UNION ALL
SELECT 'LEGACY_SETTLED_NOT_LINKED', COUNT(*)::numeric FROM legacy WHERE link_status = 'LEGACY_NOT_LINKED'
UNION ALL
SELECT 'LEGACY_SETTLED_SELF_SETTLEMENT', COUNT(*)::numeric
FROM public.expense_participants ep
JOIN public.trip_expenses te ON te.id = ep.expense_id
WHERE ep.is_paid = true
  AND ep.amount_settled > 0
  AND ep.paid_at IS NOT NULL
  AND COALESCE((SELECT epay.user_id FROM public.expense_payments epay WHERE epay.expense_id = te.id ORDER BY epay.amount_paid DESC, epay.user_id LIMIT 1), te.created_by) = ep.user_id
ORDER BY metric;

-- 5. Foreign settlement amounts grouped by currency.
WITH trip_currency AS (
  SELECT t.id AS trip_id, UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''), NULLIF(TRIM(t.currency_settings ->> 'home_currency'), ''))) AS trip_home_currency
  FROM public.trips t
)
SELECT
  UPPER(NULLIF(TRIM(sp.currency), '')) AS settlement_currency,
  COUNT(*) AS settlement_payment_count,
  ROUND(SUM(sp.amount), 2) AS total_amount
FROM public.settlement_payments sp
JOIN trip_currency tc ON tc.trip_id = sp.trip_id
WHERE tc.trip_home_currency ~ '^[A-Z]{3}$'
  AND UPPER(NULLIF(TRIM(sp.currency), '')) IS DISTINCT FROM tc.trip_home_currency
GROUP BY UPPER(NULLIF(TRIM(sp.currency), ''))
ORDER BY settlement_currency;

-- 6. Foreign settlements grouped by trip.
WITH trip_currency AS (
  SELECT t.id AS trip_id, UPPER(COALESCE(NULLIF(TRIM(t.home_currency), ''), NULLIF(TRIM(t.currency_settings ->> 'home_currency'), ''))) AS trip_home_currency
  FROM public.trips t
)
SELECT
  sp.id AS settlement_payment_id,
  sp.trip_id,
  tc.trip_home_currency,
  UPPER(NULLIF(TRIM(sp.currency), '')) AS settlement_currency,
  sp.amount,
  sp.status,
  sp.payer_id,
  sp.recipient_id,
  sp.created_at,
  sp.confirmed_at,
  sp.idempotency_key
FROM public.settlement_payments sp
JOIN trip_currency tc ON tc.trip_id = sp.trip_id
WHERE tc.trip_home_currency ~ '^[A-Z]{3}$'
  AND UPPER(NULLIF(TRIM(sp.currency), '')) IS DISTINCT FROM tc.trip_home_currency
ORDER BY sp.trip_id, sp.created_at, sp.id;
