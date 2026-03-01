-- Allow payers/creators to mark participants as paid
CREATE POLICY "Expense participants update by payer or self"
ON expense_participants
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM trip_expenses te
    WHERE te.id = expense_participants.expense_id
      AND te.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM expense_payments ep
    WHERE ep.expense_id = expense_participants.expense_id
      AND ep.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM trip_expenses te
    WHERE te.id = expense_participants.expense_id
      AND te.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM expense_payments ep
    WHERE ep.expense_id = expense_participants.expense_id
      AND ep.user_id = auth.uid()
  )
);
