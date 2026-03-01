-- Fix get_who_owes_who to only calculate based on UNPAID expense participants
-- This migration updates the function to exclude settled debts from calculations

DROP FUNCTION IF EXISTS get_who_owes_who(uuid);

-- Recreate function to calculate only UNPAID debts
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
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get what each user owes (UNPAID only)
  owed AS (
    SELECT 
      epart.user_id,
      COALESCE(SUM(epart.amount_owed), 0) as total_owed
    FROM expense_participants epart
    JOIN trip_expenses te ON te.id = epart.expense_id
    WHERE te.trip_id = p_trip_id
      AND te.is_deleted = false
      AND epart.is_paid = false -- Only count unpaid debts
    GROUP BY epart.user_id
  ),
  -- Get what others owe to each payer (UNPAID only)
  owed_to_payer AS (
    SELECT 
      ep.user_id as payer_id,
      COALESCE(SUM(epart.amount_owed), 0) as owed_by_others
    FROM expense_payments ep
    JOIN trip_expenses te ON te.id = ep.expense_id
    JOIN expense_participants epart ON epart.expense_id = te.id
    WHERE te.trip_id = p_trip_id
      AND te.is_deleted = false
      AND epart.is_paid = false -- Only unpaid debts
      AND epart.user_id != ep.user_id -- Exclude self
    GROUP BY ep.user_id
  ),
  -- Calculate net balance for each user (only unpaid transactions)
  user_balances AS (
    SELECT 
      COALESCE(o.user_id, otp.payer_id) as user_id,
      (COALESCE(otp.owed_by_others, 0) - COALESCE(o.total_owed, 0)) as balance
    FROM owed o
    FULL OUTER JOIN owed_to_payer otp ON o.user_id = otp.payer_id
  ),
  -- Get user profiles
  user_info AS (
    SELECT 
      ub.user_id,
      p.full_name as user_name,
      p.avatar_url as user_avatar,
      ub.balance
    FROM user_balances ub
    JOIN profiles p ON p.id = ub.user_id
  ),
  -- Separate debtors (negative balance - they owe)
  debtors AS (
    SELECT 
      user_id, 
      user_name, 
      user_avatar, 
      ABS(balance) as owes
    FROM user_info
    WHERE balance < 0
  ),
  -- Separate creditors (positive balance - they're owed)
  creditors AS (
    SELECT 
      user_id, 
      user_name, 
      user_avatar, 
      balance as owed
    FROM user_info
    WHERE balance > 0
  )
  -- Match debtors with creditors
  SELECT 
    d.user_id as debtor_id,
    d.user_name as debtor_name,
    d.user_avatar as debtor_avatar,
    c.user_id as creditor_id,
    c.user_name as creditor_name,
    c.user_avatar as creditor_avatar,
    LEAST(d.owes, c.owed) as amount
  FROM debtors d
  CROSS JOIN creditors c
  WHERE d.owes > 0 AND c.owed > 0
  ORDER BY amount DESC;
END;
$$;

COMMENT ON FUNCTION get_who_owes_who(uuid) IS 'Returns simplified debt relationships showing who owes whom based on UNPAID expenses only';
