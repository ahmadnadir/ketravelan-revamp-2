-- Fix get_who_owes_who to compute PAIR-WISE net amounts from UNPAID expense participants
-- Previous version cross-joined debtors and creditors and could over-allocate amounts.

DROP FUNCTION IF EXISTS get_who_owes_who(uuid);

CREATE OR REPLACE FUNCTION get_who_owes_who(p_trip_id uuid)
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
  SELECT id
  FROM trip_expenses
  WHERE trip_id = p_trip_id
    AND is_deleted = false
),
-- All payers for an expense (can be multiple); include amount paid for proportional allocation
payers AS (
  SELECT ep.expense_id,
         ep.user_id AS payer_id,
         COALESCE(ep.amount_paid, 0) AS amount_paid
  FROM expense_payments ep
  JOIN te ON te.id = ep.expense_id
),
expense_pay_totals AS (
  SELECT expense_id,
         COALESCE(SUM(amount_paid), 0) AS total_paid
  FROM payers
  GROUP BY expense_id
),
-- Unpaid participant shares per expense
participant_shares AS (
  SELECT epart.expense_id,
         epart.user_id AS debtor_id,
         COALESCE(epart.amount_owed, 0) AS amount_owed
  FROM expense_participants epart
  JOIN te ON te.id = epart.expense_id
  WHERE epart.is_paid = false
),
-- Build directed edges: debtor -> payer with proportional allocation when multiple payers exist
owed_edges AS (
  SELECT ps.debtor_id,
         p.payer_id AS creditor_id,
         SUM(
           CASE WHEN ept.total_paid IS NULL OR ept.total_paid = 0
                THEN ps.amount_owed
                ELSE ps.amount_owed * (p.amount_paid / ept.total_paid)
           END
         ) AS amount
  FROM participant_shares ps
  JOIN payers p ON p.expense_id = ps.expense_id
  LEFT JOIN expense_pay_totals ept ON ept.expense_id = p.expense_id
  GROUP BY ps.debtor_id, p.payer_id
),
-- Net per pair: A->B minus B->A
pairwise_net AS (
  SELECT 
    COALESCE(a.debtor_id, b.creditor_id) AS debtor_id,
    COALESCE(a.creditor_id, b.debtor_id) AS creditor_id,
    COALESCE(a.amount, 0) - COALESCE(b.amount, 0) AS net_amount
  FROM owed_edges a
  FULL OUTER JOIN owed_edges b
    ON a.debtor_id = b.creditor_id
   AND a.creditor_id = b.debtor_id
),
-- Keep positive nets only (debtor owes creditor)
positive_pairs AS (
  SELECT debtor_id, creditor_id, net_amount AS amount
  FROM pairwise_net
  WHERE net_amount > 0
),
profiles_join AS (
  SELECT 
    pp.debtor_id,
    d.full_name AS debtor_name,
    d.avatar_url AS debtor_avatar,
    pp.creditor_id,
    c.full_name AS creditor_name,
    c.avatar_url AS creditor_avatar,
    pp.amount
  FROM positive_pairs pp
  JOIN profiles d ON d.id = pp.debtor_id
  JOIN profiles c ON c.id = pp.creditor_id
)
SELECT *
FROM profiles_join
ORDER BY amount DESC;
$$;

COMMENT ON FUNCTION get_who_owes_who(uuid) IS 'Pair-wise net debts from UNPAID participants, proportional to payers when multiple payers exist';
