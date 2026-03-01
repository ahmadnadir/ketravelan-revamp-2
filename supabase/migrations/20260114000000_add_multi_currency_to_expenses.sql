/*
  # Add Multi-Currency Support to Trip Expenses
  
  This migration adds columns to track multi-currency expenses:
  - original_currency: The currency used when creating the expense
  - fx_rate_to_home: Exchange rate from original currency to user's home currency
  - converted_amount_home: The expense amount converted to home currency
  - home_currency: The user's home currency at the time of expense creation
  
  These fields enable proper tracking and display of expenses in different currencies.
*/

-- Add multi-currency tracking columns to trip_expenses
ALTER TABLE trip_expenses
  ADD COLUMN IF NOT EXISTS original_currency varchar(3),
  ADD COLUMN IF NOT EXISTS fx_rate_to_home numeric(12,6),
  ADD COLUMN IF NOT EXISTS converted_amount_home numeric(10,2),
  ADD COLUMN IF NOT EXISTS home_currency varchar(3);

-- Add comment for documentation
COMMENT ON COLUMN trip_expenses.original_currency IS 'Currency used when expense was created (e.g., USD, EUR, IDR)';
COMMENT ON COLUMN trip_expenses.fx_rate_to_home IS 'Exchange rate from original_currency to home_currency at time of creation';
COMMENT ON COLUMN trip_expenses.converted_amount_home IS 'Expense amount converted to home currency for tracking';
COMMENT ON COLUMN trip_expenses.home_currency IS 'User home currency at time of expense creation (for settlement calculations)';
