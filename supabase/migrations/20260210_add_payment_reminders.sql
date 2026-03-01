-- Create payment reminders log table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency varchar(3) DEFAULT 'MYR' NOT NULL,
  message text,
  channels text[] DEFAULT '{}'::text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_trip_id ON payment_reminders(trip_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_payer_id ON payment_reminders(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_recipient_id ON payment_reminders(recipient_id);

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their payment reminders" ON payment_reminders;
CREATE POLICY "Users can view their payment reminders"
  ON payment_reminders
  FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid() OR recipient_id = auth.uid());

-- Service role can insert logs (used by edge functions)
DROP POLICY IF EXISTS "System can insert payment reminders" ON payment_reminders;
CREATE POLICY "System can insert payment reminders"
  ON payment_reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'service_role' OR payer_id = auth.uid());
