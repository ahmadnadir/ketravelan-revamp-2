-- Add expense calculation functions and views
-- This migration adds the calculate_trip_expense_balances function and related views

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS calculate_trip_expense_balances(uuid);
DROP FUNCTION IF EXISTS get_who_owes_who(uuid);
DROP FUNCTION IF EXISTS get_trip_payment_methods(uuid, uuid);
DROP VIEW IF EXISTS trip_expenses_detailed;

-- Function to calculate trip expense balances for all users
CREATE OR REPLACE FUNCTION calculate_trip_expense_balances(p_trip_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_avatar text,
  total_paid numeric,
  total_owed numeric,
  balance numeric,
  owed_by_others numeric,
  settlements_received numeric,
  settlements_paid numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get all trip members
  trip_users AS (
    SELECT DISTINCT tm.user_id, p.full_name, p.avatar_url
    FROM trip_members tm
    JOIN profiles p ON p.id = tm.user_id
    WHERE tm.trip_id = p_trip_id
      AND tm.left_at IS NULL
  ),
  -- Calculate what each user paid upfront
  payments AS (
    SELECT 
      ep.user_id,
      COALESCE(SUM(ep.amount_paid), 0) as total_paid
    FROM expense_payments ep
    JOIN trip_expenses te ON te.id = ep.expense_id
    WHERE te.trip_id = p_trip_id
      AND te.is_deleted = false
    GROUP BY ep.user_id
  ),
  -- Calculate what each user owes (unpaid only)
  owed AS (
    SELECT 
      epart.user_id,
      COALESCE(SUM(epart.amount_owed), 0) as total_owed
    FROM expense_participants epart
    JOIN trip_expenses te ON te.id = epart.expense_id
    WHERE te.trip_id = p_trip_id
      AND te.is_deleted = false
      AND epart.is_paid = false -- Only unpaid amounts
    GROUP BY epart.user_id
  ),
  -- Calculate what others owe to this user (as payer)
  owed_to_me AS (
    SELECT 
      ep.user_id as payer_id,
      COALESCE(SUM(epart.amount_owed), 0) as owed_by_others
    FROM expense_payments ep
    JOIN trip_expenses te ON te.id = ep.expense_id
    JOIN expense_participants epart ON epart.expense_id = te.id
    WHERE te.trip_id = p_trip_id
      AND te.is_deleted = false
      AND epart.is_paid = false -- Only unpaid debts
      AND epart.user_id != ep.user_id -- Others owe me, not myself
    GROUP BY ep.user_id
  ),
  -- Calculate settlements received
  settlements_in AS (
    SELECT 
      payee_id as user_id,
      COALESCE(SUM(amount), 0) as received
    FROM balance_settlements
    WHERE trip_id = p_trip_id
    GROUP BY payee_id
  ),
  -- Calculate settlements paid out
  settlements_out AS (
    SELECT 
      payer_id as user_id,
      COALESCE(SUM(amount), 0) as paid
    FROM balance_settlements
    WHERE trip_id = p_trip_id
    GROUP BY payer_id
  )
  SELECT 
    tu.user_id,
    tu.full_name as user_name,
    tu.avatar_url as user_avatar,
    COALESCE(p.total_paid, 0) as total_paid,
    COALESCE(o.total_owed, 0) as total_owed,
    -- Balance = what I paid + what others owe me - what I owe + settlements received - settlements paid
    (COALESCE(p.total_paid, 0) + COALESCE(otm.owed_by_others, 0) - COALESCE(o.total_owed, 0) + COALESCE(si.received, 0) - COALESCE(so.paid, 0)) as balance,
    COALESCE(otm.owed_by_others, 0) as owed_by_others,
    COALESCE(si.received, 0) as settlements_received,
    COALESCE(so.paid, 0) as settlements_paid
  FROM trip_users tu
  LEFT JOIN payments p ON p.user_id = tu.user_id
  LEFT JOIN owed o ON o.user_id = tu.user_id
  LEFT JOIN owed_to_me otm ON otm.payer_id = tu.user_id
  LEFT JOIN settlements_in si ON si.user_id = tu.user_id
  LEFT JOIN settlements_out so ON so.user_id = tu.user_id
  ORDER BY balance DESC;
END;
$$;

-- Create view for trip expenses with enriched data
CREATE OR REPLACE VIEW trip_expenses_detailed AS
SELECT 
  te.*,
  p.full_name as creator_name,
  p.avatar_url as creator_avatar,
  p.username as creator_username,
  (
    SELECT json_agg(json_build_object(
      'user_id', ep.user_id,
      'amount_owed', ep.amount_owed,
      'is_paid', ep.is_paid,
      'paid_at', ep.paid_at,
      'user_name', pr.full_name,
      'user_avatar', pr.avatar_url
    ))
    FROM expense_participants ep
    JOIN profiles pr ON pr.id = ep.user_id
    WHERE ep.expense_id = te.id
  ) as participants,
  (
    SELECT json_agg(json_build_object(
      'user_id', epay.user_id,
      'amount_paid', epay.amount_paid,
      'user_name', pr.full_name,
      'user_avatar', pr.avatar_url
    ))
    FROM expense_payments epay
    JOIN profiles pr ON pr.id = epay.user_id
    WHERE epay.expense_id = te.id
  ) as payers
FROM trip_expenses te
LEFT JOIN profiles p ON p.id = te.created_by
WHERE te.is_deleted = false;

-- Function to get who owes who for a trip
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
  WITH balances AS (
    SELECT * FROM calculate_trip_expense_balances(p_trip_id)
  ),
  debtors AS (
    SELECT user_id, user_name, user_avatar, ABS(balance) as owes
    FROM balances
    WHERE balance < 0
  ),
  creditors AS (
    SELECT user_id, user_name, user_avatar, balance as owed
    FROM balances
    WHERE balance > 0
  )
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

-- Add payment methods functions
CREATE OR REPLACE FUNCTION get_trip_payment_methods(p_trip_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  user_avatar text,
  name text,
  description text,
  qr_code_url text,
  is_default boolean,
  is_active boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tpm.id,
    tpm.user_id,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    tpm.name,
    tpm.description,
    tpm.qr_code_url,
    tpm.is_default,
    tpm.is_active
  FROM trip_payment_methods tpm
  JOIN profiles p ON p.id = tpm.user_id
  WHERE tpm.trip_id = p_trip_id
    AND tpm.is_active = true
    AND (tpm.user_id = p_user_id OR p_user_id IS NULL)
  ORDER BY tpm.is_default DESC, tpm.created_at DESC;
END;
$$;

-- Comment on functions
COMMENT ON FUNCTION calculate_trip_expense_balances(uuid) IS 'Calculates comprehensive expense balances for all trip members including payments, debts, and settlements';
COMMENT ON FUNCTION get_who_owes_who(uuid) IS 'Returns simplified debt relationships showing who owes whom and how much';
COMMENT ON FUNCTION get_trip_payment_methods(uuid, uuid) IS 'Returns payment methods (QR codes) for trip members to facilitate payments';
